// app.js

const express = require('express');
const db = require('./database'); // Import database connection
const app = express();
const cors = cors();

// Use JSON parsing middleware
app.use(express.json());
app.use(cors());

// Route to save data to the database
app.post('/save', (req, res) => {
  const { title, price, date } = req.body;

  if (!title || !price || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const query = 'INSERT INTO items (title, price, date) VALUES (?, ?, ?)';
  db.run(query, [title, price, date], function (err) {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    return res.status(200).json({ id: this.lastID, title, price, date });
  });
});

// Route to fetch all saved data
app.get('/items', (req, res) => {
  const query = 'SELECT * FROM items';

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    res.status(200).json(rows);
  });
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
