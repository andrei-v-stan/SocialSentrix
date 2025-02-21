const express = require('express');
const path = require('path');

module.exports = function(app) {
    // Development - Frontend Access
    const cors = require('cors');
    const corsOptions = {
        origin: ["http://localhost:5173"],
    };
    app.use(cors(corsOptions));
    // Development - Frontend Access

    // Deployment - Frontend Access
    app.use(express.static(path.join(__dirname, '../../client/dist')));
    app.get('/*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
    });
    // Deployment - Frontend Access
};
