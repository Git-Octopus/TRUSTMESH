import { useState, useCallback } from 'react';
import { getWeb3Provider } from '../services/web3';

export function useWallet() {
  const [address, setAddress] = useState(null);

  const connectWallet = useCallback(async () => {
    const provider = await getWeb3Provider();
    if (provider) {
      const accounts = await provider.send('eth_requestAccounts', []);
      if (accounts.length > 0) {
        setAddress(accounts[0]);
      }
    }
  }, []);

  return { address, connectWallet };
}
