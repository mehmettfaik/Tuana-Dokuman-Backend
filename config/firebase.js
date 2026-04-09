const admin = require('firebase-admin');

let db;

const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      if (process.env.NODE_ENV === 'development' && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      } 
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
      else if (process.env.FIREBASE_PROJECT_ID) {
        
        const projectId = process.env.FIREBASE_PROJECT_ID?.trim().replace(/^["']|["']$/g, '');
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim().replace(/^["']|["']$/g, '');
        let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
        
        if (privateKey) {
          privateKey = privateKey.replace(/^["']|["']$/g, '');
          privateKey = privateKey.replace(/\\n/gm, '\n');
        }

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
    console.log('Firebase initialized successfully');
    return db;
  } catch (error) {
    console.error('Firebase initialization error:', error);
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