const multer = require('multer');

module.exports = (err, req, res, next) => {
  // Multer-specific error handling
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxMb = process.env.MAX_UPLOAD_MB || 5;
      return res.status(400).json({
        success: false,
        message: `File size exceeds the ${maxMb}MB limit.`,
        error: err.code,
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
      error: err.code,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
  }

  // CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ID format for ${err.path}`,
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};
