const express = require('express');
const { Client } = require('pg'); // PostgreSQL client
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Set up PostgreSQL client
const client = new Client({
  connectionString: "postgres://thappad_user:xAdDgifOSNlvAML8iA6QRBcrEaSOPSa5@dpg-cuh48jhu0jms73fuc290-a:5432/thappad", // Database URL from Render
  ssl: {
    rejectUnauthorized: false // Required for Render SSL connection
  }
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch((err) => console.error('Database connection error:', err));


  const createTableIfNotExists = async () => {
    const query = `
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        date DATE NOT NULL
      );
    `;
    try {
      await client.query(query);
      console.log('Table "items" is ready');
    } catch (err) {
      console.error('Error creating table:', err);
    }
  };
  
  // Call the function to ensure the table exists when the server starts
  createTableIfNotExists();

// Route to save data to the database
app.post('/save', (req, res) => {
  const { title, price } = req.body;

  if (!title || !price) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const date = new Date().toISOString().split('T')[0]; // Get the current date

  const query = 'INSERT INTO items (title, price, date) VALUES ($1, $2, $3) RETURNING *';
  client.query(query, [title, price, date], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    return res.status(200).json(result.rows[0]); // Send the inserted row
  });
});

// Route to fetch all saved data
app.get('/items', (req, res) => {
  const query = 'SELECT * FROM items';

  client.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    res.status(200).json(result.rows); // Send all rows
  });
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
