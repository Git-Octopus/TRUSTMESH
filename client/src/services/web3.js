import { BrowserProvider, Contract } from 'ethers';
import TrustMeshContract from '../contracts/TrustMesh.json';

export async function getWeb3Provider() {
  if (window.ethereum) {
    return new BrowserProvider(window.ethereum);
  }
  return null;
}

export async function getTrustMeshContract(signerOrProvider) {
  if (!TrustMeshContract.address) {
    console.warn('TrustMesh contract address is not set yet.');
  }
  return new Contract(TrustMeshContract.address || '', TrustMeshContract.abi || [], signerOrProvider);
}
