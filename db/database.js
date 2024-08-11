const mongoose = require('mongoose');
require('dotenv').config();

// Connect ke MongoDB
const uri = process.env.MONGO_URI;
const db = process.env.MONGO_DB;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB', err));

// Model Mongoose
const DataSchema = new mongoose.Schema({
  username: { type: String, required: true },
  user_agent: { type: Object, required: true },
  scrape_data: { type: Object, required: true },
  prompt: { type: String, required: true },
  lang: { type: String, required: true },
  platform: { type: String, required: true },
  result: { type: String, required: true },
  ip: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const DbModel = mongoose.model(db, DataSchema);

// Ekspor model Data
module.exports = { DbModel };