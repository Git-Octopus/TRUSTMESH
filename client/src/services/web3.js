import { BrowserProvider, Contract } from 'ethers';
import TrustMeshContract from '../contracts/TrustMesh.json';

export async function getWeb3Provider() {
  if (window.ethereum) {
    return new BrowserProvider(window.ethereum);
  }
  return null;
}

export async function getSigner() {
  const provider = await getWeb3Provider();
  if (!provider) throw new Error('MetaMask is not installed or available');
  return provider.getSigner();
}

export async function getTrustMeshContract(signerOrProvider) {
  const address = TrustMeshContract.address;
  if (!address) {
    console.warn('TrustMesh contract address is not set yet in TrustMesh.json.');
  }
  return new Contract(address || '', TrustMeshContract.abi || [], signerOrProvider);
}

export async function getTrustMeshContractWithSigner() {
  const signer = await getSigner();
  return getTrustMeshContract(signer);
}

/**
 * Creates claim on the TrustMesh smart contract
 * @param {string} claimType 
 * @param {string} referenceHash - SHA-256 evidence hash
 * @returns {Promise<{ tx: any, claimId: number }>}
 */
export async function createOnChainClaim(claimType, referenceHash) {
  const contract = await getTrustMeshContractWithSigner();
  const tx = await contract.createClaim(claimType, referenceHash);
  const receipt = await tx.wait();

  // Find ClaimCreated event to get claimId
  let claimId = 1;
  if (receipt && receipt.logs) {
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed && parsed.name === 'ClaimCreated') {
          claimId = Number(parsed.args[0]);
          break;
        }
      } catch (e) {
        // Log is not from this interface
      }
    }
  }

  return { tx, receipt, claimId };
}

/**
 * Verifies claim on the TrustMesh smart contract (Authorized verifier only)
 */
export async function verifyOnChainClaim(claimId) {
  const contract = await getTrustMeshContractWithSigner();
  const tx = await contract.verifyClaim(claimId);
  const receipt = await tx.wait();
  return { tx, receipt };
}

/**
 * Rejects claim on the TrustMesh smart contract with reason
 */
export async function rejectOnChainClaim(claimId, reason = 'Evidence did not meet verification criteria') {
  const contract = await getTrustMeshContractWithSigner();
  const tx = await contract.rejectClaim(claimId, reason);
  const receipt = await tx.wait();
  return { tx, receipt };
}

/**
 * Authorizes verifier on-chain (Contract owner only)
 */
export async function registerOnChainVerifier(verifierAddress) {
  const contract = await getTrustMeshContractWithSigner();
  const tx = await contract.registerVerifier(verifierAddress);
  const receipt = await tx.wait();
  return { tx, receipt };
}

/**
 * Revokes verifier on-chain (Contract owner only)
 */
export async function revokeOnChainVerifier(verifierAddress) {
  const contract = await getTrustMeshContractWithSigner();
  const tx = await contract.revokeVerifier(verifierAddress);
  const receipt = await tx.wait();
  return { tx, receipt };
}
