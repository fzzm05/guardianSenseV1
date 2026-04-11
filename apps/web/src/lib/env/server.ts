const requiredServerEnv = {
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY
} as const;

function getRequiredServerEnvValue(
  value: string | undefined,
  key: keyof typeof requiredServerEnv
): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export const serverEnv = {
  firebaseAdminProjectId: getRequiredServerEnvValue(
    requiredServerEnv.FIREBASE_PROJECT_ID,
    "FIREBASE_PROJECT_ID"
  ),
  firebaseAdminClientEmail: getRequiredServerEnvValue(
    requiredServerEnv.FIREBASE_CLIENT_EMAIL,
    "FIREBASE_CLIENT_EMAIL"
  ),
  firebaseAdminPrivateKey: getRequiredServerEnvValue(
    requiredServerEnv.FIREBASE_PRIVATE_KEY,
    "FIREBASE_PRIVATE_KEY"
  )
} as const;
