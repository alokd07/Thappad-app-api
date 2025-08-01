import express, { Request, Response } from 'express';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { users, thappads, notifications, userDevices } from './schema';
import { eq, and, desc, or, ne } from 'drizzle-orm';
import PushNotificationService from './pushNotificationService';

const router = express.Router();

// Database connection helper
const getDbConnection = () => {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    return drizzle(client);
};

// Register a new user
router.post('/register', async (req: Request, res: Response) => {
    const { name, email, password, expoPushToken } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required fields: name, email, password' 
        });
    }
    
    try {
        const db = getDbConnection();
        
        // Check if user already exists
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'User with this email already exists' 
            });
        }
        
        // Create new user
        const newUser = await db.insert(users).values({ 
            name, 
            email, 
            password, // In production, hash this password!
            expoPushToken: expoPushToken || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }).returning();
        
        // If expo push token provided, save device info
        if (expoPushToken && PushNotificationService.validateExpoPushToken(expoPushToken)) {
            await db.insert(userDevices).values({
                userId: newUser[0].id,
                expoPushToken,
                deviceInfo: JSON.stringify({}),
                isActive: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        const { password: _, ...userWithoutPassword } = newUser[0];
        res.status(201).json({ 
            success: true, 
            message: 'User registered successfully',
            data: userWithoutPassword 
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error registering user', 
            error: err 
        });
    }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
    const { email, password, expoPushToken } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Missing email or password' 
        });
    }
    
    try {
        const db = getDbConnection();
        
        const user = await db.select().from(users)
            .where(and(eq(users.email, email), eq(users.password, password)))
            .limit(1);
        
        if (user.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }
        
        // Update user's push token if provided
        if (expoPushToken && PushNotificationService.validateExpoPushToken(expoPushToken)) {
            await db.update(users)
                .set({ 
                    expoPushToken,
                    updatedAt: new Date().toISOString()
                })
                .where(eq(users.id, user[0].id));
            
            // Update or create device record
            const existingDevice = await db.select().from(userDevices)
                .where(and(eq(userDevices.userId, user[0].id), eq(userDevices.expoPushToken, expoPushToken)))
                .limit(1);
            
            if (existingDevice.length === 0) {
                await db.insert(userDevices).values({
                    userId: user[0].id,
                    expoPushToken,
                    deviceInfo: JSON.stringify({ lastLogin: new Date().toISOString() }),
                    isActive: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            } else {
                await db.update(userDevices)
                    .set({ 
                        isActive: 1,
                        updatedAt: new Date().toISOString()
                    })
                    .where(eq(userDevices.id, existingDevice[0].id));
            }
        }
        
        const { password: _, ...userWithoutPassword } = user[0];
        res.status(200).json({ 
            success: true, 
            message: 'Login successful',
            data: { ...userWithoutPassword, expoPushToken } 
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error logging in', 
            error: err 
        });
    }
});

// Send Thappad
router.post('/send-thappad', async (req: Request, res: Response) => {
    const { senderId, receiverId, title, message, type } = req.body;
    
    if (!senderId || !receiverId || !title || !type) {
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required fields: senderId, receiverId, title, type' 
        });
    }
    
    if (!['slap', 'leg', 'mukka', 'love'].includes(type)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid thappad type. Must be: slap, leg, mukka, or love' 
        });
    }
    
    try {
        const db = getDbConnection();
        
        // Verify sender and receiver exist
        const [sender, receiver] = await Promise.all([
            db.select().from(users).where(eq(users.id, senderId)).limit(1),
            db.select().from(users).where(eq(users.id, receiverId)).limit(1)
        ]);
        
        if (sender.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Sender not found' 
            });
        }
        
        if (receiver.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Receiver not found' 
            });
        }
        
        // Create thappad record
        const newThappad = await db.insert(thappads).values({
            senderId,
            receiverId,
            title,
            message: message || '',
            type,
            status: 'sent',
            createdAt: new Date().toISOString()
        }).returning();
        
        // Create notification record
        await db.insert(notifications).values({
            userId: receiverId,
            title: `${sender[0].name} sent you: ${title}`,
            body: message || `${title} from ${sender[0].name}`,
            data: JSON.stringify({
                thappadId: newThappad[0].id,
                senderId,
                senderName: sender[0].name,
                type: 'thappad',
                title,
                message
            }),
            type: 'thappad',
            isRead: 0,
            createdAt: new Date().toISOString()
        });
        
        // Send push notification if receiver has a push token
        let notificationSent = false;
        if (receiver[0].expoPushToken) {
            notificationSent = await PushNotificationService.sendCustomThappadNotification(
                receiver[0].expoPushToken,
                sender[0].name,
                title,
                message || `${title} from ${sender[0].name}`,
                newThappad[0].id,
                senderId
            );
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Thappad sent successfully',
            data: {
                thappad: newThappad[0],
                notificationSent,
                receiverName: receiver[0].name
            }
        });
    } catch (err) {
        console.error('Send thappad error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error sending thappad', 
            error: err 
        });
    }
});

// Get user's thappads (sent and received)
router.get('/thappads/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { type = 'all', limit = '20', offset = '0' } = req.query;
    
    try {
        const db = getDbConnection();
        const userIdInt = parseInt(userId);
        
        let thappadResults;
        
        if (type === 'received') {
            thappadResults = await db.select({
                id: thappads.id,
                title: thappads.title,
                message: thappads.message,
                type: thappads.type,
                status: thappads.status,
                createdAt: thappads.createdAt,
                senderId: thappads.senderId,
                receiverId: thappads.receiverId
            })
            .from(thappads)
            .where(eq(thappads.receiverId, userIdInt))
            .orderBy(desc(thappads.createdAt))
            .limit(parseInt(limit as string))
            .offset(parseInt(offset as string));
        } else if (type === 'sent') {
            thappadResults = await db.select({
                id: thappads.id,
                title: thappads.title,
                message: thappads.message,
                type: thappads.type,
                status: thappads.status,
                createdAt: thappads.createdAt,
                senderId: thappads.senderId,
                receiverId: thappads.receiverId
            })
            .from(thappads)
            .where(eq(thappads.senderId, userIdInt))
            .orderBy(desc(thappads.createdAt))
            .limit(parseInt(limit as string))
            .offset(parseInt(offset as string));
        } else {
            thappadResults = await db.select({
                id: thappads.id,
                title: thappads.title,
                message: thappads.message,
                type: thappads.type,
                status: thappads.status,
                createdAt: thappads.createdAt,
                senderId: thappads.senderId,
                receiverId: thappads.receiverId
            })
            .from(thappads)
            .where(
                or(
                    eq(thappads.senderId, userIdInt),
                    eq(thappads.receiverId, userIdInt)
                )
            )
            .orderBy(desc(thappads.createdAt))
            .limit(parseInt(limit as string))
            .offset(parseInt(offset as string));
        }
        
        // Get sender info for each thappad
        const enrichedResults = await Promise.all(
            thappadResults.map(async (thappad) => {
                const senderInfo = await db.select({
                    id: users.id,
                    name: users.name,
                    email: users.email
                })
                .from(users)
                .where(eq(users.id, thappad.senderId))
                .limit(1);
                
                return {
                    ...thappad,
                    sender: senderInfo[0] || null
                };
            })
        );
        
        res.status(200).json({ 
            success: true, 
            data: enrichedResults 
        });
    } catch (err) {
        console.error('Get thappads error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching thappads', 
            error: err 
        });
    }
});

// Get user's notifications
router.get('/notifications/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { unreadOnly = 'false', limit = '20', offset = '0' } = req.query;
    
    try {
        const db = getDbConnection();
        const userIdInt = parseInt(userId);
        
        let result;
        
        if (unreadOnly === 'true') {
            result = await db.select().from(notifications)
                .where(and(
                    eq(notifications.userId, userIdInt),
                    eq(notifications.isRead, 0)
                ))
                .orderBy(desc(notifications.createdAt))
                .limit(parseInt(limit as string))
                .offset(parseInt(offset as string));
        } else {
            result = await db.select().from(notifications)
                .where(eq(notifications.userId, userIdInt))
                .orderBy(desc(notifications.createdAt))
                .limit(parseInt(limit as string))
                .offset(parseInt(offset as string));
        }
        
        res.status(200).json({ 
            success: true, 
            data: result 
        });
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching notifications', 
            error: err 
        });
    }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', async (req: Request, res: Response) => {
    const { notificationId } = req.params;
    
    try {
        const db = getDbConnection();
        
        await db.update(notifications)
            .set({ isRead: 1 })
            .where(eq(notifications.id, parseInt(notificationId)));
        
        res.status(200).json({ 
            success: true, 
            message: 'Notification marked as read' 
        });
    } catch (err) {
        console.error('Mark notification read error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error marking notification as read', 
            error: err 
        });
    }
});

// Update user's push token
router.put('/users/:userId/push-token', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { expoPushToken } = req.body;
    
    if (!expoPushToken) {
        return res.status(400).json({ 
            success: false, 
            message: 'Missing expoPushToken' 
        });
    }
    
    if (!PushNotificationService.validateExpoPushToken(expoPushToken)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid Expo push token format' 
        });
    }
    
    try {
        const db = getDbConnection();
        
        // Update user's push token
        await db.update(users)
            .set({ 
                expoPushToken,
                updatedAt: new Date().toISOString()
            })
            .where(eq(users.id, parseInt(userId)));
        
        // Update or create device record
        const existingDevice = await db.select().from(userDevices)
            .where(and(eq(userDevices.userId, parseInt(userId)), eq(userDevices.expoPushToken, expoPushToken)))
            .limit(1);
        
        if (existingDevice.length === 0) {
            await db.insert(userDevices).values({
                userId: parseInt(userId),
                expoPushToken,
                deviceInfo: JSON.stringify({ updatedAt: new Date().toISOString() }),
                isActive: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        } else {
            await db.update(userDevices)
                .set({ 
                    isActive: 1,
                    updatedAt: new Date().toISOString()
                })
                .where(eq(userDevices.id, existingDevice[0].id));
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Push token updated successfully' 
        });
    } catch (err) {
        console.error('Update push token error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating push token', 
            error: err 
        });
    }
});

// Send custom notification (admin/testing)
router.post('/send-notification', async (req: Request, res: Response) => {
    const { expoPushToken, title, body, data } = req.body;
    
    if (!expoPushToken || !title || !body) {
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required fields: expoPushToken, title, body' 
        });
    }
    
    if (!PushNotificationService.validateExpoPushToken(expoPushToken)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid Expo push token format' 
        });
    }
    
    try {
        const success = await PushNotificationService.sendNotification({
            to: expoPushToken,
            sound: 'default',
            title,
            body,
            data: data || {}
        });
        
        if (success) {
            res.status(200).json({ 
                success: true, 
                message: 'Notification sent successfully' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Failed to send notification' 
            });
        }
    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error sending notification', 
            error 
        });
    }
});

// Get all users (for finding friends)
router.get('/users', async (req: Request, res: Response) => {
    const { search, excludeId } = req.query;
    
    try {
        const db = getDbConnection();
        
        let result;
        
        if (excludeId) {
            const excludeIdInt = parseInt(excludeId as string);
            result = await db.select({
                id: users.id,
                name: users.name,
                email: users.email,
                createdAt: users.createdAt
            })
            .from(users)
            .where(ne(users.id, excludeIdInt))
            .limit(50);
        } else {
            result = await db.select({
                id: users.id,
                name: users.name,
                email: users.email,
                createdAt: users.createdAt
            })
            .from(users)
            .limit(50);
        }
        
        // Simple search filter
        if (search) {
            const searchTerm = (search as string).toLowerCase();
            result = result.filter(user => 
                user.name.toLowerCase().includes(searchTerm) || 
                user.email.toLowerCase().includes(searchTerm)
            );
        }
        
        res.status(200).json({ 
            success: true, 
            data: result 
        });
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching users', 
            error: err 
        });
    }
});

// Get notifications for a user
router.get('/api/notifications/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const db = getDbConnection();

    // Get notifications where the user is the receiver
    const notifications = await db
      .select({
        id: thappads.id,
        title: thappads.title,
        message: thappads.message,
        type: thappads.type,
        senderName: users.name,
        createdAt: thappads.createdAt,
      })
      .from(thappads)
      .leftJoin(users, eq(thappads.senderId, users.id))
      .where(eq(thappads.receiverId, userId))
      .orderBy(desc(thappads.createdAt));

    console.log('Fetched notifications:', notifications);

    return res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/api/notifications/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    // For now, just return success since we don't have a read status in the database
    // In a real app, you would update a 'read' column in the thappads table
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Delete notification
router.delete('/api/notifications/:notificationId', async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const db = getDbConnection();

    // Delete the thappad record
    await db.delete(thappads).where(eq(thappads.id, notificationId));

    return res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;