const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

const requestConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
};

const predictFeed = async (payload) => {
  const response = await axios.post(`${AI_SERVICE_URL}/predict/feed`, payload, requestConfig);
  return response.data;
};

const trainFeedModel = async (trainingData) => {
  const response = await axios.post(`${AI_SERVICE_URL}/train/feed`, { records: trainingData }, requestConfig);
  return response.data;
};

const supportQuery = async (question) => {
  const response = await axios.post(`${AI_SERVICE_URL}/support/query`, { question }, requestConfig);
  return response.data;
};

const trainSupport = async (entries) => {
  const response = await axios.post(`${AI_SERVICE_URL}/support/train`, { entries }, requestConfig);
  return response.data;
};

const getSupportFaqs = async () => {
  const response = await axios.get(`${AI_SERVICE_URL}/support/faqs`, requestConfig);
  return response.data;
};

module.exports = {
  predictFeed,
  trainFeedModel,
  supportQuery,
  trainSupport,
  getSupportFaqs,
};
