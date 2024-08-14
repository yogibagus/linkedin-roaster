const mongoose = require('mongoose');
require('dotenv').config();

// Connect ke MongoDB
const uri = process.env.MONGO_URI;
const db = process.env.MONGO_DB;
const dbCookieList = process.env.MONGO_DB_COOKIE_LIST;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB', err));

// Model Mongoose
const DataSchema = new mongoose.Schema({
  job_id: { type: String, required: true },
  username: { type: String, required: true },
  scrape_data: { type: Object, required: true },
  prompt: { type: String, required: true },
  lang: { type: String, required: true },
  platform: { type: String, required: true },
  result: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Model schema for cookie list
const CookieListSchema = new mongoose.Schema({
  cookie: { type: String, required: true },
  crsf: { type: String, required: true },
  order: { type: Number, required: true },
});

const DbModel = mongoose.model(db, DataSchema);
const DbCookieListModel = mongoose.model(dbCookieList, CookieListSchema);

// Ekspor model Data
module.exports = { DbModel , DbCookieListModel };