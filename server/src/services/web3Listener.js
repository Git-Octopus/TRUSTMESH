const { JsonRpcProvider, Contract } = require('ethers');
const path = require('path');
const fs = require('fs');

// Try loading models gracefully (Dev B's models)
let Claim, Verification, User;
try {
  Claim = require('../models/Claim');
  Verification = require('../models/Verification');
  User = require('../models/User');
} catch (err) {
  console.warn('[web3Listener] Notice: Mongoose models not fully loaded yet:', err.message);
}

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
 * Initializes and starts the Web3 contract event listener.
 * Decouples MetaMask tx from database update — DB updates only after
 * the on-chain event is mined.
 * 
 * @param {string} [rpcUrl] - Local or remote JSON-RPC URL (defaults to env or 127.0.0.1:7545)
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
    console.log('[web3Listener] Missing RPC URL, contract address, or ABI. Listener skipped.');
    return null;
  }

  try {
    activeProvider = new JsonRpcProvider(targetRpc);
    activeContract = new Contract(targetAddress, targetAbi, activeProvider);

    console.log(`[web3Listener] Listening to TrustMesh events at ${targetAddress} on ${targetRpc}`);

    // 1. ClaimVerified event
    activeContract.on('ClaimVerified', async (claimId, claimant, verifier, timestamp, event) => {
      try {
        const txHash = event?.log?.transactionHash || '';
        const idNum = Number(claimId);
        console.log(`[web3Listener] Event ClaimVerified received: Claim #${idNum} by ${verifier} (tx: ${txHash})`);

        if (Claim && Verification) {
          // Find claim by onChainClaimId or fallback matching
          let claim = await Claim.findOne({
            $or: [{ onChainClaimId: idNum }, { _id: (idNum.toString().length === 24 ? idNum : undefined) }]
          });

          // Look up verifier user in DB if exists
          let verifierUser = null;
          if (User) {
            verifierUser = await User.findOne({
              walletAddress: { $regex: new RegExp(`^${verifier}$`, 'i') }
            });
          }

          if (claim) {
            claim.status = 'approved';
            claim.onChainTxHash = txHash;
            await claim.save();

            await Verification.create({
              claim: claim._id,
              verifier: verifierUser ? verifierUser._id : claim.user,
              verifierWallet: verifier,
              approved: true,
              comments: 'Verified on-chain via TrustMesh.sol',
              transactionHash: txHash,
              blockchainTimestamp: Number(timestamp)
            });

            console.log(`[web3Listener] Database synced: Claim #${idNum} set to approved`);
          } else {
            console.log(`[web3Listener] Claim #${idNum} not found in off-chain database`);
          }
        }
      } catch (err) {
        console.error('[web3Listener] Error processing ClaimVerified event:', err);
      }
    });

    // 2. ClaimRejected event
    activeContract.on('ClaimRejected', async (claimId, claimant, verifier, reason, timestamp, event) => {
      try {
        const txHash = event?.log?.transactionHash || '';
        const idNum = Number(claimId);
        console.log(`[web3Listener] Event ClaimRejected received: Claim #${idNum} - Reason: ${reason} (tx: ${txHash})`);

        if (Claim && Verification) {
          let claim = await Claim.findOne({
            $or: [{ onChainClaimId: idNum }, { _id: (idNum.toString().length === 24 ? idNum : undefined) }]
          });

          let verifierUser = null;
          if (User) {
            verifierUser = await User.findOne({
              walletAddress: { $regex: new RegExp(`^${verifier}$`, 'i') }
            });
          }

          if (claim) {
            claim.status = 'rejected';
            claim.onChainTxHash = txHash;
            await claim.save();

            await Verification.create({
              claim: claim._id,
              verifier: verifierUser ? verifierUser._id : claim.user,
              verifierWallet: verifier,
              approved: false,
              comments: reason || 'Rejected on-chain via TrustMesh.sol',
              transactionHash: txHash,
              blockchainTimestamp: Number(timestamp)
            });

            console.log(`[web3Listener] Database synced: Claim #${idNum} set to rejected`);
          }
        }
      } catch (err) {
        console.error('[web3Listener] Error processing ClaimRejected event:', err);
      }
    });

    // 3. VerificationRevoked event
    activeContract.on('VerificationRevoked', async (claimId, verifier, timestamp, event) => {
      try {
        const txHash = event?.log?.transactionHash || '';
        const idNum = Number(claimId);
        console.log(`[web3Listener] Event VerificationRevoked received: Claim #${idNum} by ${verifier}`);

        if (Claim) {
          let claim = await Claim.findOne({
            $or: [{ onChainClaimId: idNum }, { _id: (idNum.toString().length === 24 ? idNum : undefined) }]
          });

          if (claim) {
            claim.status = 'revoked';
            claim.onChainTxHash = txHash;
            await claim.save();
            console.log(`[web3Listener] Database synced: Claim #${idNum} set to revoked`);
          }
        }
      } catch (err) {
        console.error('[web3Listener] Error processing VerificationRevoked event:', err);
      }
    });

    // 4. VerifierRegistered event
    activeContract.on('VerifierRegistered', async (verifier, timestamp) => {
      try {
        console.log(`[web3Listener] Event VerifierRegistered received for ${verifier}`);
        if (User) {
          await User.updateMany(
            { walletAddress: { $regex: new RegExp(`^${verifier}$`, 'i') } },
            { $set: { role: 'verifier' } }
          );
        }
      } catch (err) {
        console.error('[web3Listener] Error processing VerifierRegistered event:', err);
      }
    });

    return activeContract;
  } catch (err) {
    console.error('[web3Listener] Failed to connect listener:', err.message);
    return null;
  }
};

/**
 * Stops and cleans up all active listeners.
 */
exports.stopListener = () => {
  if (activeContract) {
    activeContract.removeAllListeners();
    activeContract = null;
    activeProvider = null;
    console.log('[web3Listener] Event listeners stopped.');
  }
};
