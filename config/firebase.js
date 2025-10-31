const admin = require('firebase-admin');

// Firebase Admin SDK initialization
let db;

const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      // For local development, you can use service account key file
      if (process.env.NODE_ENV === 'development' && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        console.log('🔄 Initializing Firebase with service account file...');
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      } 
      // For production, use environment variables
      else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        console.log('🔄 Initializing Firebase with environment variables...');
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          }),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      } else {
        console.warn('⚠️ Firebase configuration is missing. Recipients API will not work.');
        console.warn('Required environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
        return null; // Don't throw error, let app continue without Firebase
      }
    }

    db = admin.firestore();
    console.log('✅ Firebase initialized successfully');
    console.log(`📊 Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
    return db;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    console.warn('⚠️ Continuing without Firebase. Recipients API will not work.');
    return null; // Don't throw error, let app continue
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