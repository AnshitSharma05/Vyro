const logger = require('../../shared/utils/logger');

let messagingClient = null;

/**
 * Initializes and returns Firebase Cloud Messaging client or mock implementation for development/testing.
 */
function getMessagingClient() {
  if (messagingClient) {
    return messagingClient;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    try {
      const admin = require('firebase-admin');

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
      }
      messagingClient = admin.messaging();
      logger.info('[FIREBASE CLIENT] Successfully initialized Firebase Admin SDK');
      return messagingClient;
    } catch (err) {
      logger.error({ err: err.message }, '[FIREBASE CLIENT] Failed to initialize Firebase Admin SDK. Falling back to mock.');
    }
  }

  // Fallback Mock FCM Client for development and testing environment
  messagingClient = {
    send: async (message) => {
      if (process.env.FCM_MODE === 'failure') {
        throw new Error('Firebase Messaging Delivery Failed (Simulated Error)');
      }
      return `projects/${projectId || 'mock-proj'}/messages/fcm_msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    },
  };

  return messagingClient;
}

module.exports = {
  getMessagingClient,
};
