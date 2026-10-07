const { JsonRpcProvider, Contract } = require('ethers');
const path = require('path');
const fs = require('fs');

const Claim = require('../models/Claim');
const Verification = require('../models/Verification');
const User = require('../models/User');
const { CLAIM_STATUSES } = require('../utils/constants');

let activeContract = null;
let activeProvider = null;

/**
 * Loads default contract configuration from server/src/contracts/TrustMesh.json
 */
function getDefaultContractConfig() {
  const configPath = path.join(__dirname, '../contracts/TrustMesh.json');
  if (fs.existsSync(configPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { address: data.address, abi: data.abi };
    } catch (e) {
      console.warn('[web3Listener] Failed to parse contracts/TrustMesh.json:', e.message);
    }
  }
  return { address: null, abi: null };
}

/**
 * Resolves a database claim from an on-chain event, checking onChainClaimId
 * and falling back to reading referenceHash from the contract if needed.
 */
async function findClaimForEvent(idNum, contract) {
  const query = [{ onChainClaimId: idNum }];
  if (idNum.toString().length === 24) {
    query.push({ _id: idNum });
  }

  let claim = await Claim.findOne({ $or: query });

  if (!claim && contract) {
    try {
      const onChainData = await contract.getClaim(idNum);
      if (onChainData && onChainData.referenceHash) {
        claim = await Claim.findOne({ evidenceHash: onChainData.referenceHash });
        if (claim) {
          claim.onChainClaimId = idNum;
          await claim.save();
        }
      }
    } catch (lookupErr) {
      // Fallback query failed or not found on-chain
    }
  }

  return claim;
}

/**
 * Initializes and starts the Web3 contract event listener.
 * Decouples MetaMask tx from database update — DB updates only after
 * the on-chain event is mined.
 * 
 * @param {string} [rpcUrl] - Local or remote JSON-RPC URL
 * @param {string} [contractAddress] - Deployed contract address
 * @param {Array} [abi] - Contract ABI
 */
exports.listenToEvents = (rpcUrl, contractAddress, abi) => {
  const targetRpc = rpcUrl || process.env.RPC_URL || 'http://127.0.0.1:8545';
  let targetAddress = contractAddress || process.env.CONTRACT_ADDRESS;
  let targetAbi = abi;

  if (!targetAddress || !targetAbi) {
    const defaultCfg = getDefaultContractConfig();
    targetAddress = targetAddress || defaultCfg.address;
    targetAbi = targetAbi || defaultCfg.abi;
  }

  if (!targetRpc || !targetAddress || !targetAbi) {
    console.log('[web3Listener] Notice: Missing RPC URL, contract address, or ABI. Blockchain event listener skipped.');
    return null;
  }

  try {
    activeProvider = new JsonRpcProvider(targetRpc);
    activeContract = new Contract(targetAddress, targetAbi, activeProvider);

    console.log(`[web3Listener] Starting robust block poller for TrustMesh events at ${targetAddress} on ${targetRpc}`);

    let lastPolledBlock = null;
    let isPolling = false;

    const pollEvents = async () => {
      if (isPolling || !activeContract) return;
      isPolling = true;

      try {
        const currentBlock = await activeProvider.getBlockNumber();
        if (lastPolledBlock === null) {
          lastPolledBlock = Math.max(0, currentBlock - 10);
        }

        if (currentBlock >= lastPolledBlock) {
          const fromBlock = lastPolledBlock + 1;
          const toBlock = currentBlock;

          if (fromBlock <= toBlock) {
            // Query all contract events across this block range
            const events = await activeContract.queryFilter('*', fromBlock, toBlock);

            for (const event of events) {
              const eventName = event.fragment?.name || event.eventName;
              const args = event.args || [];
              const txHash = event.transactionHash || '';

              if (eventName === 'ClaimVerified') {
                const [claimId, claimant, verifier, timestamp] = args;
                const idNum = Number(claimId);
                console.log(`[web3Listener] Event ClaimVerified: Claim #${idNum} by ${verifier} (tx: ${txHash})`);

                let claim = await findClaimForEvent(idNum, activeContract);
                const verifierUser = await User.findOne({ walletAddress: verifier.toLowerCase() });

                if (claim) {
                  claim.status = CLAIM_STATUSES.VERIFIED;
                  claim.verification = {
                    verifierId: verifierUser ? verifierUser._id : null,
                    verifierWallet: verifier.toLowerCase(),
                    verificationMethod: 'smart_contract',
                    verifiedAt: new Date(Number(timestamp) * 1000 || Date.now()),
                    transactionHash: txHash,
                    status: CLAIM_STATUSES.VERIFIED,
                  };
                  await claim.save();

                  await Verification.create({
                    claimId: claim._id,
                    verifierId: verifierUser ? verifierUser._id : null,
                    verifierWallet: verifier.toLowerCase(),
                    method: 'smart_contract',
                    status: CLAIM_STATUSES.VERIFIED,
                    approved: true,
                    comments: 'Verified on-chain via TrustMesh.sol',
                    transactionHash: txHash,
                    blockchainTimestamp: Number(timestamp) || Math.floor(Date.now() / 1000),
                  });
                  console.log(`[web3Listener] Database synced: Claim #${idNum} status set to VERIFIED`);
                }
              } else if (eventName === 'ClaimRejected') {
                const [claimId, claimant, verifier, reason, timestamp] = args;
                const idNum = Number(claimId);
                console.log(`[web3Listener] Event ClaimRejected: Claim #${idNum} - Reason: ${reason} (tx: ${txHash})`);

                let claim = await findClaimForEvent(idNum, activeContract);
                const verifierUser = await User.findOne({ walletAddress: verifier.toLowerCase() });

                if (claim) {
                  claim.status = CLAIM_STATUSES.REJECTED;
                  claim.verification = {
                    verifierId: verifierUser ? verifierUser._id : null,
                    verifierWallet: verifier.toLowerCase(),
                    verificationMethod: 'smart_contract',
                    verifiedAt: new Date(Number(timestamp) * 1000 || Date.now()),
                    transactionHash: txHash,
                    status: CLAIM_STATUSES.REJECTED,
                  };
                  await claim.save();

                  await Verification.create({
                    claimId: claim._id,
                    verifierId: verifierUser ? verifierUser._id : null,
                    verifierWallet: verifier.toLowerCase(),
                    method: 'smart_contract',
                    status: CLAIM_STATUSES.REJECTED,
                    approved: false,
                    comments: reason || 'Rejected on-chain via TrustMesh.sol',
                    transactionHash: txHash,
                    blockchainTimestamp: Number(timestamp) || Math.floor(Date.now() / 1000),
                  });
                  console.log(`[web3Listener] Database synced: Claim #${idNum} status set to REJECTED`);
                }
              } else if (eventName === 'VerificationRevoked') {
                const [claimId, verifier, timestamp] = args;
                const idNum = Number(claimId);
                console.log(`[web3Listener] Event VerificationRevoked: Claim #${idNum} by ${verifier}`);

                let claim = await findClaimForEvent(idNum, activeContract);
                if (claim) {
                  claim.status = CLAIM_STATUSES.REVOKED;
                  if (claim.verification) {
                    claim.verification.status = CLAIM_STATUSES.REVOKED;
                  }
                  await claim.save();

                  await Verification.create({
                    claimId: claim._id,
                    verifierWallet: verifier.toLowerCase(),
                    method: 'smart_contract',
                    status: CLAIM_STATUSES.REVOKED,
                    approved: false,
                    comments: 'Verification revoked on-chain',
                    transactionHash: txHash,
                    blockchainTimestamp: Number(timestamp) || Math.floor(Date.now() / 1000),
                  });
                  console.log(`[web3Listener] Database synced: Claim #${idNum} status set to REVOKED`);
                }
              } else if (eventName === 'VerifierRegistered') {
                const [verifier] = args;
                console.log(`[web3Listener] Event VerifierRegistered for ${verifier}`);
                await User.updateMany(
                  { walletAddress: verifier.toLowerCase() },
                  { $set: { role: 'verifier', accountType: 'verifier', verifierStatus: 'approved' } }
                );
              } else if (eventName === 'VerifierRevoked') {
                const [verifier] = args;
                console.log(`[web3Listener] Event VerifierRevoked for ${verifier}`);
                await User.updateMany(
                  { walletAddress: verifier.toLowerCase() },
                  { $set: { role: 'owner', accountType: 'user', verifierStatus: 'revoked' } }
                );
              }
            }

            lastPolledBlock = toBlock;
          }
        }
      } catch (pollErr) {
        // Silently tolerate temporary RPC hiccups without throwing unhandled exceptions
      } finally {
        isPolling = false;
      }
    };

    // Poll every 3 seconds
    const intervalTimer = setInterval(pollEvents, 3000);
    activeContract._pollTimer = intervalTimer;

    return activeContract;
  } catch (err) {
    console.warn('[web3Listener] Could not establish blockchain listener connection:', err.message);
    return null;
  }
};

/**
 * Stops and cleans up all active listeners.
 */
exports.stopListener = () => {
  if (activeContract) {
    if (activeContract._pollTimer) {
      clearInterval(activeContract._pollTimer);
    }
    activeContract = null;
    activeProvider = null;
    console.log('[web3Listener] Event listeners stopped.');
  }
};
