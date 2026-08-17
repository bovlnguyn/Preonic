import api from './api';

const AI_REQUEST_CONFIG = {
  skipAuthToken: true,
  skipAuthRefresh: true,
  timeout: 40_000,
};

export const getPublicAiStatus = async () => {
  const response = await api.get('/ai/public/status', AI_REQUEST_CONFIG);
  return response.data?.data;
};

export const sendPublicAiMessage = async ({ message, history = [] }) => {
  const response = await api.post(
    '/ai/public/chat',
    { message, history },
    AI_REQUEST_CONFIG
  );

  return response.data?.data;
};


export const getFarmerAiStatus = async () => {
  const response = await api.get('/ai/farmer/status', { timeout: 40_000 });
  return response.data?.data;
};

export const sendFarmerAiMessage = async ({ message, history = [], currentFeature = '' }) => {
  const response = await api.post(
    '/ai/farmer/chat',
    { message, history, currentFeature },
    { timeout: 45_000 }
  );

  return response.data?.data;
};
