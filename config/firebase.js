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
      // For production, use environment variables
      else if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
          }),
          projectId: process.env.FIREBASE_PROJECT_ID
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