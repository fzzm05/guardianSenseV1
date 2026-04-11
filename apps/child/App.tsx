import * as Application from 'expo-application';
import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { PAIRING_CODE_LENGTH } from '@guardiansense/types';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { config } from './src/lib/config';
import { getChildPlatform } from './src/lib/platform';
import {
  ChildSession,
  clearChildSession,
  loadChildSession,
  saveChildSession,
} from './src/lib/storage';

const ACTIVE_STARTUP_SYNC_DELAY_MS = 1_500;
const FAST_MOVING_SYNC_INTERVAL_MS = 5_000;
const MOVING_SYNC_INTERVAL_MS = 15_000;
const STOPPED_SYNC_INTERVAL_MS = 60_000;
const LOW_BATTERY_MIN_SYNC_INTERVAL_MS = 120_000;
const LOW_BATTERY_THRESHOLD = 0.15;
const FAST_MOVING_SPEED_THRESHOLD = 8;
const MOVING_SPEED_THRESHOLD = 1;

type SendLocationUpdateOptions = {
  reason: 'manual' | 'auto';
};

type DeviceTelemetry = Awaited<ReturnType<typeof collectDeviceTelemetry>>;

type SendLocationUpdateResult = {
  sentAtLabel: string;
  nextIntervalMs: number;
  telemetry: DeviceTelemetry;
  position: Location.LocationObject;
};

export default function App() {
  const [pairingCode, setPairingCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [session, setSession] = useState<ChildSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [locationPermission, setLocationPermission] = useState<
    'unknown' | 'granted' | 'denied'
  >('unknown');
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pairingNotice, setPairingNotice] = useState<string | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [autoSyncStatus, setAutoSyncStatus] = useState<string | null>(null);
  const [manualLatitude, setManualLatitude] = useState('23.2599');
  const [manualLongitude, setManualLongitude] = useState('77.4126');
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendInFlightRef = useRef(false);

  useEffect(() => {
    loadChildSession()
      .then((value) => {
        setSession(value);
      })
      .finally(() => {
        setLoadingSession(false);
      });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setLocationPermission('unknown');
      setLocationStatus(null);
      setAutoSyncStatus(null);
      return;
    }

    let isMounted = true;

    Location.getForegroundPermissionsAsync()
      .then((permission) => {
        if (!isMounted) {
          return;
        }

        setLocationPermission(permission.granted ? 'granted' : 'denied');
      })
      .catch((permissionError) => {
        console.log('[location] failed to read permission state:', permissionError);
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

  async function sendLocationUpdate(
    options: SendLocationUpdateOptions,
  ): Promise<SendLocationUpdateResult | null> {
    if (!session) {
      return null;
    }

    if (sendInFlightRef.current) {
      return null;
    }

    sendInFlightRef.current = true;
    setError(null);

    try {
      const result = await sendLocationUpdateInternal({
        session,
        manualLatitude,
        manualLongitude,
        setError,
        setSendingLocation,
        setLocationPermission,
        setLocationStatus,
      });

      if (options.reason === 'auto') {
        setLocationStatus(null);
      }

      return result;
    } catch (locationError) {
      console.log('[location] send failed:', locationError);
      setError(
        locationError instanceof Error
          ? locationError.message
          : 'Failed to send location update.',
      );

      return null;
    } finally {
      sendInFlightRef.current = false;
      setSendingLocation(false);
    }
  }

  useEffect(() => {
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }

    if (!session) {
      return;
    }

    if (appState !== 'active') {
      setAutoSyncStatus(
        'App is backgrounded. Foreground adaptive sync is paused until OS-managed tracking is added.',
      );
      return;
    }

    if (locationPermission !== 'granted') {
      setAutoSyncStatus('Automatic sync is waiting for location permission.');
      return;
    }

    let cancelled = false;

    const scheduleNextSync = (delayMs: number) => {
      if (cancelled) {
        return;
      }

      autoSyncTimerRef.current = setTimeout(async () => {
        const result = await sendLocationUpdate({ reason: 'auto' });

        if (cancelled) {
          return;
        }

        const nextDelayMs = result?.nextIntervalMs ?? STOPPED_SYNC_INTERVAL_MS;
        setAutoSyncStatus(buildAutoSyncStatusLabel(result, nextDelayMs));
        scheduleNextSync(nextDelayMs);
      }, delayMs);
    };

    scheduleNextSync(ACTIVE_STARTUP_SYNC_DELAY_MS);

    return () => {
      cancelled = true;

      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current);
        autoSyncTimerRef.current = null;
      }
    };
  }, [appState, locationPermission, session]);

  async function handleVerifyPairingCode() {
    const trimmedCode = pairingCode.trim();

    if (!new RegExp(`^\\d{${PAIRING_CODE_LENGTH}}$`).test(trimmedCode)) {
      setError(`Pairing code must be exactly ${PAIRING_CODE_LENGTH} digits.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setPairingNotice(null);

    const deviceMetadata = buildDeviceMetadata();
    const payload = {
      code: trimmedCode,
      deviceName: deviceName.trim() || undefined,
      deviceMetadata,
      platform: getChildPlatform(),
    };
    const requestUrl = `${config.apiBaseUrl}/api/pairing-codes/verify`;

    try {
      console.log('[pairing] starting verification request');
      console.log('[pairing] api base url:', config.apiBaseUrl);
      console.log('[pairing] request url:', requestUrl);
      console.log('[pairing] payload:', payload);

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('[pairing] response status:', response.status);
      console.log('[pairing] response ok:', response.ok);

      const data = await response.json();
      console.log('[pairing] response body:', data);

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to verify pairing code.');
      }

      await saveChildSession(data);
      console.log('[pairing] saved child session:', data);
      setSession(data);
      setPairingCode('');
      setDeviceName('');
      setPairingNotice(buildPairingNotice(data));
    } catch (submissionError) {
      console.log('[pairing] verification request failed:', submissionError);
      if (submissionError instanceof Error) {
        console.log('[pairing] error message:', submissionError.message);
        console.log('[pairing] error stack:', submissionError.stack);
      }

      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Something went wrong.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    await clearChildSession();
    setSession(null);
    setError(null);
    setPairingNotice(null);
    setLocationStatus(null);
    setLocationPermission('unknown');
    setAutoSyncStatus(null);
  }

  async function handleEnableLocation() {
    if (!session) {
      return;
    }

    setError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      const granted = permission.granted;

      setLocationPermission(granted ? 'granted' : 'denied');

      if (!granted) {
        setLocationStatus('Location permission was denied.');
        return;
      }

      setLocationStatus('Location permission granted. Adaptive sync is ready.');
    } catch (permissionError) {
      console.log('[location] permission request failed:', permissionError);
      setLocationStatus('Unable to request location permission.');
    }
  }

  async function handleSendCurrentLocation() {
    await sendLocationUpdate({ reason: 'manual' });
  }

  if (loadingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#8fb4ff" size="large" />
        <Text style={styles.loadingText}>Loading child device state...</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  if (session) {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.screen}
      >
      <View style={styles.container}>
        <Text style={styles.eyebrow}>GuardianSense</Text>
        <Text style={styles.title}>Device Paired</Text>
        <Text style={styles.description}>
          This device is now enrolled as a child device and ready for adaptive
          foreground location syncing.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Child</Text>
          <Text style={styles.cardValue}>{session.childName}</Text>
          <Text style={styles.cardMeta}>Child ID: {session.childId}</Text>
          <Text style={styles.cardMeta}>Device ID: {session.deviceId}</Text>
          <Text style={styles.cardMeta}>Platform: {session.platform}</Text>
          <Text style={styles.cardMeta}>
            Location permission: {locationPermission}
          </Text>
          <Text style={styles.cardMeta}>App state: {appState}</Text>
        </View>

        <Pressable onPress={handleEnableLocation} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Enable location</Text>
        </Pressable>

        {!Device.isDevice ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Emulator Fallback Location</Text>
            <Text style={styles.cardMeta}>
              Use these coordinates if the emulator still cannot provide a live location fix.
            </Text>
            <View style={styles.form}>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={setManualLatitude}
                placeholder="Latitude"
                placeholderTextColor="#6c819d"
                style={styles.input}
                value={manualLatitude}
              />
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={setManualLongitude}
                placeholder="Longitude"
                placeholderTextColor="#6c819d"
                style={styles.input}
                value={manualLongitude}
              />
            </View>
          </View>
        ) : null}

        <Pressable
          disabled={sendingLocation}
          onPress={handleSendCurrentLocation}
          style={[styles.primaryButton, sendingLocation && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>
            {sendingLocation ? 'Sending location...' : 'Send current location'}
          </Text>
        </Pressable>

        <Pressable onPress={handleReset} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Reset pairing</Text>
        </Pressable>

        {autoSyncStatus ? (
          <Text style={styles.statusText}>{autoSyncStatus}</Text>
        ) : null}
        {locationStatus ? (
          <Text style={styles.statusText}>{locationStatus}</Text>
        ) : null}
        {pairingNotice ? (
          <Text style={styles.statusText}>{pairingNotice}</Text>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <StatusBar style="light" />
      </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.screen}
    >
    <View style={styles.container}>
      <Text style={styles.eyebrow}>GuardianSense</Text>
      <Text style={styles.title}>Pair This Device</Text>
      <Text style={styles.description}>
        Enter the pairing code from the parent dashboard to register this phone
        as the child device.
      </Text>

      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          maxLength={PAIRING_CODE_LENGTH}
          keyboardType="number-pad"
          onChangeText={setPairingCode}
          placeholder={`${PAIRING_CODE_LENGTH}-digit pairing code`}
          placeholderTextColor="#6c819d"
          style={styles.input}
          value={pairingCode}
        />

        <TextInput
          autoCapitalize="words"
          onChangeText={setDeviceName}
          placeholder="Device name (optional)"
          placeholderTextColor="#6c819d"
          style={styles.input}
          value={deviceName}
        />

        <Pressable
          disabled={submitting}
          onPress={handleVerifyPairingCode}
          style={[styles.primaryButton, submitting && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Verifying...' : 'Verify pairing code'}
          </Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <StatusBar style="light" />
    </View>
    </ScrollView>
  );
}

async function sendLocationUpdateInternal({
  session,
  manualLatitude,
  manualLongitude,
  setError,
  setSendingLocation,
  setLocationPermission,
  setLocationStatus,
}: {
  session: ChildSession;
  manualLatitude: string;
  manualLongitude: string;
  setError: (value: string | null) => void;
  setSendingLocation: (value: boolean) => void;
  setLocationPermission: (value: 'unknown' | 'granted' | 'denied') => void;
  setLocationStatus: (value: string | null) => void;
}): Promise<SendLocationUpdateResult> {
  setSendingLocation(true);
  setError(null);

  let permission = await Location.getForegroundPermissionsAsync();

  if (!permission.granted) {
    permission = await Location.requestForegroundPermissionsAsync();
  }

  const granted = permission.granted;
  setLocationPermission(granted ? 'granted' : 'denied');

  if (!granted) {
    throw new Error('Location permission is required before sending updates.');
  }

  const position = await resolveCurrentPosition({
    manualLatitude,
    manualLongitude,
  });
  const telemetry = await collectDeviceTelemetry();
  const requestUrl = `${config.apiBaseUrl}/api/location-events`;
  const payload = {
    childId: session.childId,
    deviceId: session.deviceId,
    point: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters: position.coords.accuracy ?? null,
      altitudeMeters: position.coords.altitude ?? null,
      speedMetersPerSecond: position.coords.speed ?? null,
      headingDegrees: position.coords.heading ?? null,
      recordedAt: new Date(position.timestamp).toISOString(),
    },
    telemetry,
    source: 'gps',
  };

  console.log('[location] sending current location:', payload);

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.deviceToken}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  console.log('[location] response status:', response.status);
  console.log('[location] response body:', data);

  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to send location update.');
  }

  const nextIntervalMs = determineNextSyncIntervalMs({
    speedMetersPerSecond: position.coords.speed ?? null,
    batteryLevel: telemetry.batteryLevel,
  });
  const sentAtLabel = new Date().toLocaleTimeString();

  setLocationStatus(`Location update sent at ${sentAtLabel}.`);

  return {
    sentAtLabel,
    nextIntervalMs,
    telemetry,
    position,
  };
}

async function resolveCurrentPosition({
  manualLatitude,
  manualLongitude,
}: {
  manualLatitude: string;
  manualLongitude: string;
}) {
  const servicesEnabled = await Location.hasServicesEnabledAsync();

  if (!servicesEnabled && Platform.OS === 'android') {
    try {
      await Location.enableNetworkProviderAsync();
    } catch (providerError) {
      console.log('[location] failed to enable Android network provider:', providerError);
    }
  }

  const servicesEnabledAfterPrompt = await Location.hasServicesEnabledAsync();

  if (!servicesEnabledAfterPrompt) {
    throw new Error(buildLocationUnavailableMessage('services-disabled'));
  }

  try {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: true,
    });
  } catch (currentPositionError) {
    console.log('[location] getCurrentPositionAsync failed:', currentPositionError);
  }

  const lastKnownPosition = await Location.getLastKnownPositionAsync({
    maxAge: 10 * 60 * 1000,
    requiredAccuracy: 1_000,
  });

  if (lastKnownPosition) {
    console.log('[location] falling back to last known position');
    return lastKnownPosition;
  }

  const fallbackLatitude = Number(manualLatitude);
  const fallbackLongitude = Number(manualLongitude);

  if (
    !Device.isDevice &&
    Number.isFinite(fallbackLatitude) &&
    Number.isFinite(fallbackLongitude)
  ) {
    console.log('[location] falling back to manual emulator coordinates');
    return {
      coords: {
        latitude: fallbackLatitude,
        longitude: fallbackLongitude,
        altitude: null,
        accuracy: 50,
        altitudeAccuracy: null,
        heading: null,
        speed: 0,
      },
      timestamp: Date.now(),
    } as Location.LocationObject;
  }

  throw new Error(buildLocationUnavailableMessage('position-unavailable'));
}

function determineNextSyncIntervalMs({
  speedMetersPerSecond,
  batteryLevel,
}: {
  speedMetersPerSecond: number | null;
  batteryLevel: number | null;
}) {
  let nextIntervalMs = STOPPED_SYNC_INTERVAL_MS;

  if (
    speedMetersPerSecond != null &&
    Number.isFinite(speedMetersPerSecond) &&
    speedMetersPerSecond >= FAST_MOVING_SPEED_THRESHOLD
  ) {
    nextIntervalMs = FAST_MOVING_SYNC_INTERVAL_MS;
  } else if (
    speedMetersPerSecond != null &&
    Number.isFinite(speedMetersPerSecond) &&
    speedMetersPerSecond >= MOVING_SPEED_THRESHOLD
  ) {
    nextIntervalMs = MOVING_SYNC_INTERVAL_MS;
  }

  if (
    batteryLevel != null &&
    Number.isFinite(batteryLevel) &&
    batteryLevel <= LOW_BATTERY_THRESHOLD
  ) {
    nextIntervalMs = Math.max(nextIntervalMs, LOW_BATTERY_MIN_SYNC_INTERVAL_MS);
  }

  return nextIntervalMs;
}

function buildAutoSyncStatusLabel(
  result: SendLocationUpdateResult | null | undefined,
  nextIntervalMs: number,
) {
  const nextLabel = formatIntervalLabel(nextIntervalMs);

  if (!result) {
    return `Automatic sync is active. Next check in about ${nextLabel}.`;
  }

  const speed = result.position.coords.speed ?? null;
  const battery = result.telemetry.batteryLevel;

  return `Automatic sync sent at ${result.sentAtLabel}. Next check in about ${nextLabel} (${describeSyncMode(
    speed,
    battery,
  )}).`;
}

function describeSyncMode(
  speedMetersPerSecond: number | null,
  batteryLevel: number | null,
) {
  if (
    batteryLevel != null &&
    Number.isFinite(batteryLevel) &&
    batteryLevel <= LOW_BATTERY_THRESHOLD
  ) {
    return 'battery saver mode';
  }

  if (
    speedMetersPerSecond != null &&
    Number.isFinite(speedMetersPerSecond) &&
    speedMetersPerSecond >= FAST_MOVING_SPEED_THRESHOLD
  ) {
    return 'fast movement mode';
  }

  if (
    speedMetersPerSecond != null &&
    Number.isFinite(speedMetersPerSecond) &&
    speedMetersPerSecond >= MOVING_SPEED_THRESHOLD
  ) {
    return 'active movement mode';
  }

  return 'stationary mode';
}

function formatIntervalLabel(intervalMs: number) {
  const seconds = Math.round(intervalMs / 1000);

  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

async function collectDeviceTelemetry() {
  const [batteryLevel, batteryState, networkState] = await Promise.all([
    Battery.getBatteryLevelAsync().catch(() => null),
    Battery.getBatteryStateAsync().catch(() => null),
    Network.getNetworkStateAsync().catch(() => null),
  ]);

  return {
    batteryLevel:
      typeof batteryLevel === 'number' && Number.isFinite(batteryLevel)
        ? batteryLevel
        : null,
    isCharging:
      batteryState === Battery.BatteryState.CHARGING ||
      batteryState === Battery.BatteryState.FULL,
    networkType: mapNetworkType(networkState?.type),
    osVersion: buildOsVersion(),
    appVersion: buildAppVersion(),
  };
}

function buildDeviceMetadata() {
  return {
    appVersion: buildAppVersion(),
    deviceBrand: Device.brand ?? undefined,
    deviceModel: Device.modelName ?? undefined,
    osVersion: buildOsVersion() ?? undefined,
  };
}

function mapNetworkType(networkType?: Network.NetworkStateType | null) {
  if (!networkType || networkType === Network.NetworkStateType.UNKNOWN) {
    return null;
  }

  return String(networkType).toLowerCase();
}

function buildOsVersion() {
  const deviceLabel = [Device.brand, Device.modelName].filter(Boolean).join(' ');
  const osLabel = [Device.osName, Device.osVersion].filter(Boolean).join(' ');
  const combined = [deviceLabel, osLabel].filter(Boolean).join(' · ');

  return combined || null;
}

function buildAppVersion() {
  const parts = [Application.nativeApplicationVersion, Application.nativeBuildVersion].filter(
    Boolean,
  );

  if (parts.length === 0) {
    return 'expo-go';
  }

  return parts.join(' (build ') + (parts.length > 1 ? ')' : '');
}

function buildPairingNotice(result: {
  childName?: string;
  pairingMode?: 'new-child' | 'existing-child';
  deviceAccessMode?: 'first-device' | 'recognized-device' | 'new-device';
}) {
  if (result.pairingMode === 'existing-child' && result.deviceAccessMode === 'recognized-device') {
    return `Parent approval confirmed. Welcome back to ${result.childName ?? 'GuardianSense'}.`;
  }

  if (result.pairingMode === 'existing-child' && result.deviceAccessMode === 'new-device') {
    return `Parent approved this new device for ${result.childName ?? 'this child account'}.`;
  }

  return `Pairing approved for ${result.childName ?? 'this child account'}.`;
}

function buildLocationUnavailableMessage(
  reason: 'services-disabled' | 'position-unavailable',
) {
  if (!Device.isDevice && Platform.OS === 'android') {
    if (reason === 'services-disabled') {
      return 'Android location services are off. Turn on system location in the emulator settings and set a mock location from the emulator controls.';
    }

    return 'Current location is unavailable in the emulator. Set a mock location from the emulator controls (... > Location) and try again.';
  }

  if (reason === 'services-disabled') {
    return 'Location services are disabled. Turn on system location services and try again.';
  }

  return 'Current location is unavailable. Move to an area with a location fix and try again.';
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#081120',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#c7d5ea',
    fontSize: 16,
  },
  container: {
    backgroundColor: '#081120',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    minHeight: '100%',
    width: '100%',
  },
  screen: {
    flex: 1,
    backgroundColor: '#081120',
  },
  scrollContent: {
    flexGrow: 1,
  },
  eyebrow: {
    color: '#8fb4ff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fbff',
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    color: '#c7d5ea',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 340,
  },
  form: {
    width: '100%',
    gap: 12,
    marginTop: 28,
  },
  input: {
    width: '100%',
    backgroundColor: '#0f1b30',
    borderColor: '#23344e',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f8fbff',
    fontSize: 16,
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: '#8fb4ff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#081120',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 16,
    borderColor: '#23344e',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#c7d5ea',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  card: {
    width: '100%',
    backgroundColor: '#0f1b30',
    borderColor: '#23344e',
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginTop: 28,
    gap: 6,
  },
  cardLabel: {
    color: '#8fb4ff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardValue: {
    color: '#f8fbff',
    fontSize: 24,
    fontWeight: '700',
  },
  cardMeta: {
    color: '#c7d5ea',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    marginTop: 18,
    color: '#ffb1bd',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 340,
  },
  statusText: {
    marginTop: 18,
    color: '#9fd7b8',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 340,
  },
});
