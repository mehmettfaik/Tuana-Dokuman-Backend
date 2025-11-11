const admin = require('firebase-admin');

// Firebase Admin SDK initialization
let db;

const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      // For local development, you can use service account key file
      if (process.env.NODE_ENV === 'development' && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      } 
      // Support providing the full service account JSON in an environment variable
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        let serviceAccount;
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        } catch (e) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID
        });
      }
      // For production, use environment variables
      else if (process.env.FIREBASE_PROJECT_ID) {
        // Sanitize inputs (Render and other platforms may add surrounding quotes)
        const projectId = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID.trim();
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_CLIENT_EMAIL.trim().replace(/^"|"$/g, '');
        let privateKey = process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.trim();
        if (privateKey) {
          // Replace escaped newlines and remove surrounding quotes if present
          privateKey = privateKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
        }

        // Basic validation and helpful error message
        if (!projectId || !clientEmail || !privateKey) {
          throw new Error('Firebase credentials incomplete. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are set correctly in environment.');
        }

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
          }),
          projectId
        });
      } else {
        throw new Error('Firebase configuration is missing. Please set FIREBASE_PROJECT_ID and other required environment variables.');
      }
    }

    db = admin.firestore();
    console.log('✅ Firebase initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
  }
};

const getFirestore = () => {
  if (!db) {
    return initializeFirebase();
  }
  return db;
};

module.exports = {
  initializeFirebase,
  getFirestore,
  admin
};