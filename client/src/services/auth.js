import api from './api';

export async function getNonce(walletAddress) {
  const res = await api.post('/auth/nonce', { walletAddress });
  return res.data;
}

export async function loginWithSignature(walletAddress, signature) {
  const res = await api.post('/auth/login', { walletAddress, signature });
  return res.data;
}

export async function sendOtp(email) {
  const res = await api.post('/auth/send-otp', { email });
  return res.data;
}

export async function verifyOtp(email, otp) {
  const res = await api.post('/auth/verify-otp', { email, otp });
  return res.data;
}

export async function register(userData) {
  const res = await api.post('/auth/register', userData);
  return res.data;
}
