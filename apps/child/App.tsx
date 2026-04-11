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

    if (!deviceName.trim()) {
      setError('Please enter a name for this device.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setPairingNotice(null);

    const deviceMetadata = buildDeviceMetadata();
    const payload = {
      code: trimmedCode,
      deviceName: deviceName.trim(),
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
      <View style={styles.screen}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          style={styles.screen}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Logo bar */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <View style={styles.logoIcon}>
                  <Text style={styles.logoIconText}>G</Text>
                </View>
                <Text style={styles.eyebrow}>GuardianSense</Text>
              </View>
              <View style={styles.badge}>
                <View style={[styles.badgeDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.badgeText}>Tracking active</Text>
              </View>
            </View>

            <View style={styles.heroSection}>
              <Text style={styles.title}>Device Paired</Text>
              <Text style={styles.description}>
                This device is enrolled and reporting location data securely to your parent dashboard.
              </Text>
            </View>

            {/* Info Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Identity</Text>
              </View>
              <View style={styles.cardContent}>
                <InfoRow label="Child Name" value={session.childName} highlight />
                <InfoRow label="Platform" value={session.platform} />
                <View style={styles.divider} />
                <InfoRow label="Child ID" value={session.childId} mono />
                <InfoRow label="Device ID" value={session.deviceId} mono />
              </View>
            </View>

            {/* Status Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Real-time Status</Text>
              </View>
              <View style={styles.cardContent}>
                <InfoRow label="App State" value={appState.charAt(0).toUpperCase() + appState.slice(1)} />
                <InfoRow 
                  label="Permissions" 
                  value={locationPermission === 'granted' ? 'Enabled' : 'Action Required'} 
                  valueColor={locationPermission === 'granted' ? '#10b981' : '#f43f5e'}
                />
              </View>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              {locationPermission !== 'granted' && (
                <Pressable onPress={handleEnableLocation} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Enable location</Text>
                </Pressable>
              )}

              <Pressable
                disabled={sendingLocation}
                onPress={handleSendCurrentLocation}
                style={[styles.actionButton, sendingLocation && styles.disabledButton]}
              >
                <Text style={styles.actionButtonText}>
                  {sendingLocation ? 'Syncing...' : 'Sync position now'}
                </Text>
              </Pressable>

              {!Device.isDevice ? (
                <View style={styles.emulatorPanel}>
                  <Text style={styles.cardLabel}>Emulator Debug</Text>
                  <View style={styles.formRow}>
                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={setManualLatitude}
                      placeholder="Lat"
                      placeholderTextColor="#525252"
                      style={styles.smallInput}
                      value={manualLatitude}
                    />
                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={setManualLongitude}
                      placeholder="Long"
                      placeholderTextColor="#525252"
                      style={styles.smallInput}
                      value={manualLongitude}
                    />
                  </View>
                </View>
              ) : null}

              <Pressable onPress={handleReset} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>Reset pairing</Text>
              </Pressable>
            </View>

            {/* Footer status logs */}
            <View style={styles.statusLog}>
              {autoSyncStatus ? <Text style={styles.logText}>{autoSyncStatus}</Text> : null}
              {locationStatus ? <Text style={styles.logText}>{locationStatus}</Text> : null}
              {error ? <Text style={[styles.logText, { color: '#f43f5e' }]}>{error}</Text> : null}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.screen}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoIconText}>G</Text>
              </View>
              <Text style={styles.eyebrow}>GuardianSense</Text>
            </View>
          </View>

          <View style={styles.heroSection}>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.description}>
              Enter the pairing code from the parent dashboard to register this device.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pairing Code</Text>
              <TextInput
                autoCapitalize="none"
                maxLength={PAIRING_CODE_LENGTH}
                keyboardType="number-pad"
                onChangeText={setPairingCode}
                placeholder="000000"
                placeholderTextColor="#525252"
                style={styles.mainInput}
                value={pairingCode}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Device Name</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setDeviceName}
                placeholder="e.g. Rahul's iPhone"
                placeholderTextColor="#525252"
                style={styles.mainInput}
                value={deviceName}
              />
            </View>

            <Pressable
              disabled={submitting}
              onPress={handleVerifyPairingCode}
              style={[styles.primaryButton, submitting && styles.disabledButton]}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? 'Verifying...' : 'Register Device'}
              </Text>
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function InfoRow({ label, value, highlight, mono, valueColor }: { 
  label: string; 
  value: string; 
  highlight?: boolean;
  mono?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={[
        styles.infoRowValue, 
        highlight && { color: '#f5f5f5', fontWeight: '600' },
        mono && { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13 },
        valueColor ? { color: valueColor } : null
      ]}>
        {value}
      </Text>
    </View>
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
  screen: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  loadingText: {
    color: '#737373',
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 28,
    height: 28,
    backgroundColor: '#10b981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  eyebrow: {
    color: '#f5f5f5',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b98115',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    gap: 6,
    borderWidth: 1,
    borderColor: '#10b98125',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
  },
  heroSection: {
    marginBottom: 32,
  },
  title: {
    color: '#f5f5f5',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  description: {
    color: '#737373',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  card: {
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    backgroundColor: '#1a1a1a',
  },
  cardTitle: {
    color: '#737373',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  infoRowLabel: {
    color: '#737373',
    fontSize: 13,
  },
  infoRowValue: {
    color: '#a3a3a3',
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#262626',
    marginVertical: 4,
  },
  controls: {
    marginTop: 16,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#f5f5f5',
    fontSize: 15,
    fontWeight: '500',
  },
  resetButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#737373',
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  disabledButton: {
    opacity: 0.5,
  },
  form: {
    gap: 20,
    marginTop: 8,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: '#737373',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  mainInput: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f5f5f5',
    fontSize: 16,
  },
  errorBanner: {
    marginTop: 24,
    backgroundColor: '#ef444410',
    borderWidth: 1,
    borderColor: '#ef444430',
    borderRadius: 12,
    padding: 16,
  },
  errorBannerText: {
    color: '#f87171',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  statusLog: {
    marginTop: 32,
    gap: 8,
  },
  logText: {
    color: '#525252',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  emulatorPanel: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardLabel: {
    color: '#737373',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smallInput: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f5f5f5',
    fontSize: 13,
  },
});
