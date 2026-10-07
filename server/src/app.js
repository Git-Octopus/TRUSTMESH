const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const claimsRoutes = require('./routes/claims');
const verificationRoutes = require('./routes/verification');
const verifiersRoutes = require('./routes/verifiers');
const verificationController = require('./controllers/verificationController');

const app = express();

// Security and utility middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: false, // Allow iframes for document and proof preview
  })
);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded evidence files with permissive framing headers for in-browser preview
const primaryUploadsPath = fs.existsSync('/app')
  ? path.resolve('/app/uploads')
  : path.join(__dirname, '../../uploads');
const fallbackUploadsPath = path.join(__dirname, '../../uploads');

const uploadHeaderMiddleware = (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.removeHeader('X-Frame-Options');
  next();
};

app.use('/uploads', uploadHeaderMiddleware, express.static(primaryUploadsPath));
if (fallbackUploadsPath !== primaryUploadsPath) {
  app.use('/uploads', uploadHeaderMiddleware, express.static(fallbackUploadsPath));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date(),
    service: 'TrustMesh Backend API',
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/verifiers', verifiersRoutes);

// Direct mapping for GET /api/trust-score/:profileId as specified in API design
app.get('/api/trust-score/:profileId', verificationController.getTrustScore);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
