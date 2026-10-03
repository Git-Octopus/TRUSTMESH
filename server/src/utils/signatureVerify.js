const { verifyMessage } = require('ethers');

/**
 * Verifies an Ethereum message signature.
 * @param {string} message - Original plain text message that was signed
 * @param {string} signature - Hex signature produced by wallet
 * @param {string} expectedAddress - Expected Ethereum wallet address
 * @returns {boolean} True if signature matches expected address
 */
const verifySignature = (message, signature, expectedAddress) => {
  try {
    if (!message || !signature || !expectedAddress) {
      return false;
    }
    const recoveredAddress = verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    return false;
  }
};

/**
 * Builds standard authentication nonce message for sign-in.
 * @param {string} walletAddress 
 * @param {string} nonce 
 * @returns {string} Formatted authentication message
 */
const getAuthMessage = (walletAddress, nonce) => {
  return `Sign this message to authenticate with TrustMesh:\nWallet: ${walletAddress.toLowerCase()}\nNonce: ${nonce}`;
};

module.exports = {
  verifySignature,
  getAuthMessage,
};
