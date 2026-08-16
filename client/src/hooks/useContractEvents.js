import { useEffect } from 'react';

export function useContractEvents(contract, eventName, callback) {
  useEffect(() => {
    if (!contract || !eventName || !callback) return;

    contract.on(eventName, callback);
    return () => {
      contract.off(eventName, callback);
    };
  }, [contract, eventName, callback]);
}
