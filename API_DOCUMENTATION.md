# Thappad API Documentation

## Overview
This API provides endpoints for user authentication, sending thappads, and real-time push notifications.

## Base URL
- Local: `http://localhost:3000`
- Production: `https://thappad-app-api.onrender.com`

## Endpoints

### Authentication

#### 1. Register User
```
POST /api/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "createdAt": "2025-01-31T10:30:00.000Z",
    "updatedAt": "2025-01-31T10:30:00.000Z"
  }
}
```

#### 2. Login User
```
POST /api/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123",
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
  }
}
```

### Thappad Operations

#### 3. Send Thappad
```
POST /api/send-thappad
```

**Request Body:**
```json
{
  "senderId": 1,
  "receiverId": 2,
  "title": "Friendly Slap",
  "message": "Just saying hi!",
  "type": "slap" // options: "slap", "leg", "mukka", "love"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thappad sent successfully",
  "data": {
    "thappad": {
      "id": 1,
      "senderId": 1,
      "receiverId": 2,
      "title": "Friendly Slap",
      "message": "Just saying hi!",
      "type": "slap",
      "status": "sent",
      "createdAt": "2025-01-31T10:30:00.000Z"
    },
    "notificationSent": true,
    "receiverName": "Jane Doe"
  }
}
```

#### 4. Get User's Thappads
```
GET /api/thappads/:userId?type=all&limit=20&offset=0
```

**Query Parameters:**
- `type`: "all" | "sent" | "received" (default: "all")
- `limit`: number (default: 20)
- `offset`: number (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Friendly Slap",
      "message": "Just saying hi!",
      "type": "slap",
      "status": "sent",
      "createdAt": "2025-01-31T10:30:00.000Z",
      "senderId": 1,
      "receiverId": 2,
      "sender": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

### Notifications

#### 5. Get User Notifications
```
GET /api/notifications/:userId?unreadOnly=false&limit=20&offset=0
```

**Query Parameters:**
- `unreadOnly`: boolean (default: false)
- `limit`: number (default: 20)
- `offset`: number (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 2,
      "title": "John Doe sent you a slap!",
      "body": "You received a slap from John Doe",
      "data": "{\"thappadId\":1,\"senderId\":1,\"senderName\":\"John Doe\",\"type\":\"thappad\"}",
      "type": "thappad",
      "isRead": 0,
      "createdAt": "2025-01-31T10:30:00.000Z"
    }
  ]
}
```

#### 6. Mark Notification as Read
```
PUT /api/notifications/:notificationId/read
```

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

#### 7. Send Custom Notification
```
POST /api/send-notification
```

**Request Body:**
```json
{
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title": "Custom Notification",
  "body": "This is a custom notification message",
  "data": {
    "customKey": "customValue"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification sent successfully"
}
```

### User Management

#### 8. Update Push Token
```
PUT /api/users/:userId/push-token
```

**Request Body:**
```json
{
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Push token updated successfully"
}
```

#### 9. Get Users (Find Friends)
```
GET /api/users?search=john&excludeId=1
```

**Query Parameters:**
- `search`: string (optional) - search by name or email
- `excludeId`: number (optional) - exclude specific user ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "createdAt": "2025-01-31T10:30:00.000Z"
    }
  ]
}
```

## Real-time Notifications

When a thappad is sent, the system automatically:

1. **Creates a thappad record** in the database
2. **Creates a notification record** for the receiver
3. **Sends a push notification** to the receiver's device (if they have a valid push token)

### Push Notification Format

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "👋 Thappad from John Doe",
  "body": "John Doe sent you a slap!",
  "data": {
    "type": "thappad",
    "thappadId": 1,
    "senderId": 1,
    "senderName": "John Doe",
    "thappadType": "slap",
    "action": "view_thappad"
  },
  "priority": "high",
  "channelId": "thappad-notifications"
}
```

## Thappad Types

The system supports 4 types of thappads:

1. **slap** 👋 - A friendly slap
2. **leg** 🦵 - A kick
3. **mukka** 👊 - A punch
4. **love** ❤️ - A love gesture

Each type has its own emoji and message format in notifications.

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (in development)"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (invalid credentials)
- `404` - Not Found (user/resource not found)
- `409` - Conflict (user already exists)
- `500` - Internal Server Error

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  expoPushToken TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Thappads Table
```sql
CREATE TABLE thappads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  senderId INTEGER NOT NULL,
  receiverId INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES users (id),
  FOREIGN KEY (receiverId) REFERENCES users (id)
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data TEXT,
  type TEXT NOT NULL,
  isRead INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users (id)
);
```

### User Devices Table
```sql
CREATE TABLE userDevices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  expoPushToken TEXT NOT NULL,
  deviceInfo TEXT,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users (id)
);
```

## Environment Variables

```env
TURSO_DATABASE_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token
PORT=3000
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file with your Turso credentials

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Test the API:**
   The server will initialize the database tables automatically on first run.

## Testing with cURL

### Register a user:
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "expoPushToken": "ExponentPushToken[your_token_here]"
  }'
```

### Send a thappad:
```bash
curl -X POST http://localhost:3000/api/send-thappad \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": 1,
    "receiverId": 2,
    "title": "Test Slap",
    "message": "Testing the API!",
    "type": "slap"
  }'
```

## Production Deployment

The API is ready for deployment on platforms like:
- Render
- Vercel
- Railway
- Heroku

Make sure to set the appropriate environment variables in your deployment platform.
