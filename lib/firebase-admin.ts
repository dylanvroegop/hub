import admin from 'firebase-admin';

import { getFirebaseProjectId } from '@/lib/env';

function getPrivateKey(): string | undefined {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) return undefined;
  return raw
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n');
}

export function getFirebaseAdminApp(): admin.app.App {
  if (admin.apps.length > 0) return admin.app();

  const projectId = getFirebaseProjectId();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim().replace(/^['"]|['"]$/g, '');
  const privateKey = getPrivateKey();

  if (clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  }

  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });
}

export function getFirebaseAdminAuth(): admin.auth.Auth {
  return admin.auth(getFirebaseAdminApp());
}

export function getFirestoreAdmin(): admin.firestore.Firestore {
  return admin.firestore(getFirebaseAdminApp());
}
