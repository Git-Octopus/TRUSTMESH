const { JsonRpcProvider } = require('ethers');

const getProvider = () => {
  const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:7545';
  return new JsonRpcProvider(rpcUrl);
};

module.exports = { getProvider };
