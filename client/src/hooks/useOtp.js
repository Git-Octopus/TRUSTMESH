import { useState } from 'react';

export function useOtp() {
  const [otp, setOtp] = useState('');
  const [isSent, setIsSent] = useState(false);

  return { otp, setOtp, isSent, setIsSent };
}
