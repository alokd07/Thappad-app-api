import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { items } from './src/schema';
import router from './src/router';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Use the router for API routes
app.use('/api', router);

// Connect to Turso
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const db = drizzle(client);

// Initialize the server
const initializeServer = async () => {
  // Ensure tables exist (create manually if not using migrations)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      date TEXT NOT NULL
    );
  `);
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      expoPushToken TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS thappads (
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
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
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
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS userDevices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      expoPushToken TEXT NOT NULL,
      deviceInfo TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id)
    );
  `);
  
  console.log('All tables are ready');
};

// POST /save — Add item
app.post('/save', async (req, res) => {
  const { title, price } = req.body;
  if (!title || !price) {
    return res.status(400).json({ message: 'Missing title or price' });
  }

  const date = new Date().toISOString().split('T')[0];

  try {
    const inserted = await db.insert(items).values({ title, price, date }).returning();
    res.status(200).json(inserted[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error saving item', error: err });
  }
});

// GET /items — Get all items
app.get('/items', async (req, res) => {
  try {
    const allItems = await db.select().from(items);
    res.status(200).json(allItems);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching items', error: err });
  }
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await initializeServer();
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
