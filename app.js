const dotenv = require("dotenv");
dotenv.config(); ;
const express = require('express');
const cors = require('cors');
const uploadRoutes = require('./routes/uploadRoutes');
const AWS = require('./routes/awsroute');


const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/upload', uploadRoutes);
app.use('/api', AWS);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: err.message 
  });
});

module.exports = app;
