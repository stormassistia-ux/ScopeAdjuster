import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Attempt to initialize Firebase Admin. If no service account is provided, 
// initialize with just the projectId (which allows verifying tokens)
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'stormassistia-2a2b7' 
    });
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

export const auth = admin.auth();
