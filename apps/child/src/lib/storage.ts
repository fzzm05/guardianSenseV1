import AsyncStorage from "@react-native-async-storage/async-storage";

export const CHILD_SESSION_STORAGE_KEY = "guardiansense.child-session";

export type ChildSession = {
  childId: string;
  childName: string;
  parentId: string;
  deviceId: string;
  deviceToken: string;
  platform: "ios" | "android" | "web";
};

export async function saveChildSession(session: ChildSession) {
  await AsyncStorage.setItem(CHILD_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function loadChildSession(): Promise<ChildSession | null> {
  const value = await AsyncStorage.getItem(CHILD_SESSION_STORAGE_KEY);

  if (!value) {
    return null;
  }

  return JSON.parse(value) as ChildSession;
}

export async function clearChildSession() {
  await AsyncStorage.removeItem(CHILD_SESSION_STORAGE_KEY);
}
