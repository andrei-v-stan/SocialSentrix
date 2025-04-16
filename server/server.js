require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./services/mongo.js');
const { startScheduledCleanup } = require('./services/cleanupMongo.js');

const app = express();
connectDB();
startScheduledCleanup();

app.use(cookieParser());
app.use(express.json());


require('./routes/frontendAccess').setupDevCors(app);

app.use(require('./routes/routing.js'));

require('./routes/frontendAccess').serveFrontend(app);


app.listen(8080, () => {
  console.log('Server is running on port 8080');
});
