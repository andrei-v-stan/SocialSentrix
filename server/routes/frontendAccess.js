const express = require('express');
const path = require('path');
const cors = require('cors');

// Development - Frontend Access
exports.setupDevCors = function (app) {
  const corsOptions = {
    origin: ["http://localhost:5173"],
    credentials: true
  };
  app.use(cors(corsOptions));
  
  app.get('/', (req, res) => {
    res.redirect('http://localhost:5173/');
  });
};

// Deployment - Frontend Access
exports.serveFrontend = function (app) {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
};
