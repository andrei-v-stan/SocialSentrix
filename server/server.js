const express = require('express');
const app = express();

app.get('/api/test', (req, res) => {
    res.json({
        message: 'Hello there!'
    });
});


require('./routes/frontendAccess')(app);

app.listen(8080, () => {
    console.log('Server is running on port 8080');
});