const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const claimsRoutes = require('./routes/claims');
const verificationRoutes = require('./routes/verification');
const verifiersRoutes = require('./routes/verifiers');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/verifiers', verifiersRoutes);

app.use(errorHandler);

module.exports = app;
