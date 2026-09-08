require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { listenToEvents } = require('./services/web3Listener');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`========================================`);
      console.log(` TrustMesh Server running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`========================================`);

      // Initialize Web3 blockchain event listener if configured
      listenToEvents();
    });
  })
  .catch((err) => {
    console.error('Failed to connect to database / start server:', err);
    process.exit(1);
  });
