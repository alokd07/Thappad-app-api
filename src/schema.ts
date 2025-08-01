import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  price: real('price').notNull(),
  date: text('date').notNull(),
});
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull(),
});
export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('itemId').notNull(),
  quantity: integer('quantity').notNull(),
  totalPrice: real('totalPrice').notNull(),
  orderDate: text('orderDate').notNull(),
});
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  expoPushToken: text('expoPushToken'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
});

export const thappads = sqliteTable('thappads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  senderId: integer('senderId').notNull().references(() => users.id),
  receiverId: integer('receiverId').notNull().references(() => users.id),
  title: text('title').notNull(),
  message: text('message'),
  type: text('type').notNull(), // 'slap', 'leg', 'mukka', 'love'
  status: text('status').notNull(),
  createdAt: text('createdAt').notNull(),
});

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').notNull().references(() => users.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  data: text('data'), // JSON string for additional data
  type: text('type').notNull(), // 'thappad', 'system', 'reminder'
  isRead: integer('isRead').notNull(),
  createdAt: text('createdAt').notNull(),
});

export const userDevices = sqliteTable('userDevices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').notNull().references(() => users.id),
  expoPushToken: text('expoPushToken').notNull(),
  deviceInfo: text('deviceInfo'), // JSON string for device details
  isActive: integer('isActive').notNull(),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
});
