const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDb } = require('./dbconnection/dbconfig');
const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const index = require('./routes/index.js');
const cookie = require('cookie-parser');

dotenv.config();

connectDb();
const app = express();
app.use(cookie());
const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5000'];
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));
app.use(express.json());


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

app.use('/api/',require('./routes/index'))