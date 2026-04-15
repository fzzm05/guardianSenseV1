import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export const CHILD_SESSION_STORAGE_KEY = "guardiansense.child-session";

export type ChildSession = {
  childId: string;
  childName: string;
  parentId: string;
  deviceId: string;
  deviceToken: string;
  platform: "ios" | "android" | "web";
};

async function isSecureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function saveChildSession(session: ChildSession) {
  const isSecure = await isSecureStoreAvailable();
  const value = JSON.stringify(session);

  if (isSecure) {
    await SecureStore.setItemAsync(CHILD_SESSION_STORAGE_KEY, value);
  } else {
    await AsyncStorage.setItem(CHILD_SESSION_STORAGE_KEY, value);
  }
}

export async function loadChildSession(): Promise<ChildSession | null> {
  const isSecure = await isSecureStoreAvailable();
  let value: string | null = null;

  if (isSecure) {
    value = await SecureStore.getItemAsync(CHILD_SESSION_STORAGE_KEY);

    // Migration logic: if not found in SecureStore, check AsyncStorage
    if (!value) {
      const legacyValue = await AsyncStorage.getItem(CHILD_SESSION_STORAGE_KEY);
      if (legacyValue) {
        console.log("[storage] migrating session from AsyncStorage to SecureStore");
        await SecureStore.setItemAsync(CHILD_SESSION_STORAGE_KEY, legacyValue);
        await AsyncStorage.removeItem(CHILD_SESSION_STORAGE_KEY);
        value = legacyValue;
      }
    }
  } else {
    value = await AsyncStorage.getItem(CHILD_SESSION_STORAGE_KEY);
  }

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as ChildSession;
  } catch {
    return null;
  }
}

export async function clearChildSession() {
  const isSecure = await isSecureStoreAvailable();

  if (isSecure) {
    await SecureStore.deleteItemAsync(CHILD_SESSION_STORAGE_KEY);
  } else {
    await AsyncStorage.removeItem(CHILD_SESSION_STORAGE_KEY);
  }
}
