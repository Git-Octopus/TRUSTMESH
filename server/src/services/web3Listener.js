const { JsonRpcProvider, Contract } = require('ethers');

exports.listenToEvents = (rpcUrl, contractAddress, abi) => {
  if (!rpcUrl || !contractAddress) {
    console.log('[web3Listener] Missing RPC URL or contract address, listener skipped.');
    return;
  }
  const provider = new JsonRpcProvider(rpcUrl);
  const contract = new Contract(contractAddress, abi, provider);
  console.log(`[web3Listener] Listening to contract events at ${contractAddress}`);
};
