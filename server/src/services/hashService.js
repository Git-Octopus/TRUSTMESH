const crypto = require('crypto');

exports.hashBuffer = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};
