/**
 * Firebase Configuration and Initialization
 * Intercountry Centre for Oral Health for Africa (ICOH) Portal
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigData from '../../firebase-applet-config.json';

const rawProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const isCustomProject = Boolean(
  rawProjectId && rawProjectId !== firebaseConfigData.projectId
);

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
export const isPlaceholderConfig = Boolean(
  isCustomProject && (!rawApiKey || rawApiKey === 'your_api_key' || rawApiKey.includes('your_api_key'))
);

const firebaseConfig = {
  apiKey: rawApiKey || firebaseConfigData.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain,
  projectId: rawProjectId || firebaseConfigData.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigData.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || (isCustomProject ? '(default)' : firebaseConfigData.firestoreDatabaseId),
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Initialize Firestore with databaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Test Firestore connection on boot as mandated by security skill
export async function testConnection(): Promise<boolean> {
  if (isPlaceholderConfig) {
    console.warn('ICOH Portal: Firebase Web API Key is currently set to "your_api_key". Please configure a valid API key from your Firebase console in .env.');
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'systemSettings', 'connection_test'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('ICOH Portal: Firestore client is offline. Check your network or Firebase configuration.');
      return false;
    }
    // Permission denied or not found is normal for test doc before setup
    return true;
  }
}

// Error Handling Infrastructure conforming strictly to skill standard
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default app;
