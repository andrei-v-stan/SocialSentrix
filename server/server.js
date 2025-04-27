require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const { connectMongo } = require('./services/mongo');
const { startScheduledCleanup } = require('./services/cleanupMongo');

async function main() {
  console.log('\n');
  await connectMongo();

  const app = express();

  app.use(cookieParser());
  app.use(express.json());

  require('./routes/frontendAccess').setupDevCors(app);
  app.use(require('./routes/routing.js'));
  require('./routes/frontendAccess').serveFrontend(app);

  startScheduledCleanup();

  app.listen(8080, () => {
    console.log('🚀 Server is running on port 8080');
  });
}

main().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
