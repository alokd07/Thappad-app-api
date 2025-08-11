interface PushNotificationPayload {
  to: string;
  sound: string;
  title: string;
  body: string;
  data?: any;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

interface NotificationData {
  type: 'thappad' | 'system' | 'reminder';
  thappadId?: number;
  senderId?: number;
  senderName?: string;
  thappadType?: string;
  action?: string;
}

export class PushNotificationService {
  private static readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
  
  static async sendNotification(payload: PushNotificationPayload): Promise<boolean> {
    try {
      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Push notification failed:', errorData);
        return false;
      }

      const result = await response.json();
      console.log('Push notification sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
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
      love: 'sent you love!'
    };

    const emoji = thappadEmojis[thappadType] || '👋';
    const message = thappadMessages[thappadType] || 'sent you a thappad!';

    const notificationData: NotificationData = {
      type: 'thappad',
      thappadId,
      senderId,
      senderName,
      thappadType,
      action: 'view_thappad'
    };

    const payload: PushNotificationPayload = {
      to: receiverToken,
      sound: 'default',
      title: `${emoji} Thappad from ${senderName}`,
      body: `${senderName} ${message}`,
      data: notificationData,
      priority: 'high',
      channelId: 'thappad-notifications'
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

    const notificationData: NotificationData = {
      type: 'thappad',
      thappadId,
      senderId,
      senderName,
      thappadType: thappadTitle,
      action: 'view_thappad'
    };

    const payload: PushNotificationPayload = {
      to: receiverToken,
      sound: 'default',
      title: `${emoji} ${thappadTitle} from ${senderName}`,
      body: thappadMessage,
      data: notificationData,
      priority: 'high',
      channelId: 'thappad-notifications'
    };

    return await this.sendNotification(payload);
  }

  static async sendBulkNotifications(payloads: PushNotificationPayload[]): Promise<boolean[]> {
    const promises = payloads.map(payload => this.sendNotification(payload));
    return await Promise.all(promises);
  }

  static validateExpoPushToken(token: string): boolean {
    const expoTokenRegex = /^ExponentPushToken\[[\w-]+\]$/;
    return expoTokenRegex.test(token);
  }
}

export default PushNotificationService;
