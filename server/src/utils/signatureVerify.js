const { verifyMessage } = require('ethers');

exports.verifySignature = (message, signature, expectedAddress) => {
  try {
    const recoveredAddress = verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    return false;
  }
};
