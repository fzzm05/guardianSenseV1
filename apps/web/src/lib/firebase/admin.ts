import { App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";

import { serverEnv } from "@/lib/env/server";

export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    credential: cert({
      projectId: serverEnv.firebaseAdminProjectId,
      clientEmail: serverEnv.firebaseAdminClientEmail,
      privateKey: serverEnv.firebaseAdminPrivateKey.replace(/\\n/g, "\n")
    })
  });
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}
