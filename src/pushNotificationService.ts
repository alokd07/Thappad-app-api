import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  // In production, use environment variables for Firebase config
  // For now, using a service account key (should be stored securely)
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || "your-project-id",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "",
    private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL || "",
    client_id: process.env.FIREBASE_CLIENT_ID || "",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || ""
  };

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }
}

interface FCMNotificationPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

interface NotificationData {
  type: 'thappad' | 'system' | 'reminder';
  thappadId?: string;
  senderId?: string;
  senderName?: string;
  thappadType?: string;
  action?: string;
}

export class PushNotificationService {
  
  static async sendNotification(payload: FCMNotificationPayload): Promise<boolean> {
    try {
      if (!admin.apps.length) {
        console.error('Firebase Admin SDK not initialized');
        return false;
      }

      const message: admin.messaging.Message = {
        token: payload.token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        android: {
          notification: {
            channelId: 'thappad-notifications',
            priority: 'high' as const,
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('FCM notification sent successfully:', response);
      return true;
    } catch (error) {
      console.error('Error sending FCM notification:', error);
      return false;
    }
  }

  static async sendThappadNotification(
    receiverToken: string,
    senderName: string,
    thappadType: string,
    thappadId: number,
    senderId: number
  ): Promise<boolean> {
    const thappadEmojis: Record<string, string> = {
      slap: '👋',
      leg: '🦵',
      mukka: '👊',
      love: '❤️',
      xoxo: '😘'
    };

    const thappadMessages: Record<string, string> = {
      slap: 'sent you a slap!',
      leg: 'kicked you!',
      mukka: 'punched you!',
      love: 'sent you love!',
      xoxo: 'sent you kisses!'
    };

    const emoji = thappadEmojis[thappadType] || '👋';
    const message = thappadMessages[thappadType] || 'sent you a thappad!';

    const notificationData: Record<string, string> = {
      type: 'thappad',
      thappadId: thappadId.toString(),
      senderId: senderId.toString(),
      senderName,
      thappadType,
      action: 'view_thappad'
    };

    const payload: FCMNotificationPayload = {
      token: receiverToken,
      title: `${emoji} Thappad from ${senderName}`,
      body: `${senderName} ${message}`,
      data: notificationData,
    };

    return await this.sendNotification(payload);
  }

  static async sendCustomThappadNotification(
    receiverToken: string,
    senderName: string,
    thappadTitle: string,
    thappadMessage: string,
    thappadId: number,
    senderId: number
  ): Promise<boolean> {
    // Choose appropriate emoji based on title content
    let emoji = '👋'; // default
    if (thappadTitle.toLowerCase().includes('love') || thappadTitle.toLowerCase().includes('heart')) {
      emoji = '❤️';
    } else if (thappadTitle.toLowerCase().includes('mukka') || thappadTitle.toLowerCase().includes('punch')) {
      emoji = '👊';
    } else if (thappadTitle.toLowerCase().includes('laat') || thappadTitle.toLowerCase().includes('kick') || thappadTitle.toLowerCase().includes('leg')) {
      emoji = '🦵';
    } else if (thappadTitle.toLowerCase().includes('thappad') || thappadTitle.toLowerCase().includes('slap') || thappadTitle.toLowerCase().includes('crying')) {
      emoji = '👋';
    } else if (thappadTitle.toLowerCase().includes('xoxo')) {
      emoji = '😘';
    }

    const notificationData: Record<string, string> = {
      type: 'thappad',
      thappadId: thappadId.toString(),
      senderId: senderId.toString(),
      senderName,
      thappadType: thappadTitle,
      action: 'view_thappad'
    };

    const payload: FCMNotificationPayload = {
      token: receiverToken,
      title: `${emoji} ${thappadTitle} from ${senderName}`,
      body: thappadMessage,
      data: notificationData,
    };

    return await this.sendNotification(payload);
  }

  static async sendBulkNotifications(payloads: FCMNotificationPayload[]): Promise<boolean[]> {
    const promises = payloads.map(payload => this.sendNotification(payload));
    return await Promise.all(promises);
  }

  static validateFCMToken(token: string): boolean {
    // FCM tokens are typically long strings
    return !!(token && token.length > 100);
  }

  // Legacy method for backward compatibility
  static validateExpoPushToken(token: string): boolean {
    // For now, treat as FCM token validation
    return this.validateFCMToken(token);
  }
}

export default PushNotificationService;
