import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";

import { publicEnv } from "@/lib/env/public";

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    apiKey: publicEnv.firebaseApiKey,
    authDomain: publicEnv.firebaseAuthDomain,
    projectId: publicEnv.firebaseProjectId,
    appId: publicEnv.firebaseAppId
  });
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
