import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let firebaseAdminApp: App | null = null;

function getPrivateKey(): string | undefined {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) return undefined;
  return raw.replace(/\\n/g, '\n');
}

export function getFirebaseAdminApp(): App {
  if (firebaseAdminApp) return firebaseAdminApp;

  if (getApps().length > 0) {
    firebaseAdminApp = getApps()[0]!;
    return firebaseAdminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (projectId && clientEmail && privateKey) {
    firebaseAdminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
    return firebaseAdminApp;
  }

  firebaseAdminApp = initializeApp();
  return firebaseAdminApp;
}

export function getFirestoreAdmin() {
  return getFirestore(getFirebaseAdminApp());
}
