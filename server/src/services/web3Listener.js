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

    console.log(`[web3Listener] Listening to TrustMesh events at ${targetAddress} on ${targetRpc}`);

    // 1. ClaimVerified event
    activeContract.on('ClaimVerified', async (claimId, claimant, verifier, timestamp, event) => {
      try {
        const txHash = event?.log?.transactionHash || '';
        const idNum = Number(claimId);
        console.log(`[web3Listener] Event ClaimVerified: Claim #${idNum} by ${verifier} (tx: ${txHash})`);

        // Find claim by onChainClaimId or fallback matching
        let claim = await Claim.findOne({
          $or: [
            { onChainClaimId: idNum },
            { _id: idNum.toString().length === 24 ? idNum : undefined },
          ],
        });

        const verifierUser = await User.findOne({
          walletAddress: verifier.toLowerCase(),
        });

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
            blockchainTimestamp: Number(timestamp),
          });

          console.log(`[web3Listener] Database synced: Claim #${idNum} status set to VERIFIED`);
        } else {
          console.log(`[web3Listener] Claim #${idNum} not found in database`);
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
        console.log(`[web3Listener] Event ClaimRejected: Claim #${idNum} - Reason: ${reason} (tx: ${txHash})`);

        let claim = await Claim.findOne({
          $or: [
            { onChainClaimId: idNum },
            { _id: idNum.toString().length === 24 ? idNum : undefined },
          ],
        });

        const verifierUser = await User.findOne({
          walletAddress: verifier.toLowerCase(),
        });

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
            blockchainTimestamp: Number(timestamp),
          });

          console.log(`[web3Listener] Database synced: Claim #${idNum} status set to REJECTED`);
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
        console.log(`[web3Listener] Event VerificationRevoked: Claim #${idNum} by ${verifier}`);

        let claim = await Claim.findOne({
          $or: [
            { onChainClaimId: idNum },
            { _id: idNum.toString().length === 24 ? idNum : undefined },
          ],
        });

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
            blockchainTimestamp: Number(timestamp),
          });

          console.log(`[web3Listener] Database synced: Claim #${idNum} status set to REVOKED`);
        }
      } catch (err) {
        console.error('[web3Listener] Error processing VerificationRevoked event:', err);
      }
    });

    // 4. VerifierRegistered event
    activeContract.on('VerifierRegistered', async (verifier, timestamp) => {
      try {
        console.log(`[web3Listener] Event VerifierRegistered for ${verifier}`);
        await User.updateMany(
          { walletAddress: verifier.toLowerCase() },
          { $set: { role: 'verifier' } }
        );
      } catch (err) {
        console.error('[web3Listener] Error processing VerifierRegistered event:', err);
      }
    });

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
    activeContract.removeAllListeners();
    activeContract = null;
    activeProvider = null;
    console.log('[web3Listener] Event listeners stopped.');
  }
};
