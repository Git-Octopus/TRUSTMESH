import api from './api';

export async function login(credentials) {
  const response = await api.post('/auth/login', credentials);
  return response.data;
}

export async function register(userData) {
  const response = await api.post('/auth/register', userData);
  return response.data;
}

export async function verifyOtp(data) {
  const response = await api.post('/auth/verify-otp', data);
  return response.data;
}
