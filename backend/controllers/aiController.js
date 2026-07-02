/**
 * AI Controller
 * Routes to call the Python AI microservice
 */

const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/apiResponse');
const aiService = require('../services/aiService');

exports.predictFeed = asyncHandler(async (req, res) => {
  const { animalType, ageMonths, weightKg, feedCategory, pastureQuality } = req.body;

  if (!animalType || ageMonths == null || weightKg == null) {
    throw new ApiError(400, 'animalType, ageMonths and weightKg are required');
  }

  const result = await aiService.predictFeed({
    animalType,
    ageMonths,
    weightKg,
    feedCategory: feedCategory || 'standard',
    pastureQuality: pastureQuality || 'average',
  });

  if (!result.success) {
    throw new ApiError(502, result.message || 'AI service failed to predict feed');
  }

  res.status(200).json(sendSuccess(200, result.data, 'Feed recommendation retrieved successfully'));
});

exports.trainFeedModel = asyncHandler(async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    throw new ApiError(400, 'Training records are required');
  }

  const result = await aiService.trainFeedModel(records);
  if (!result.success) {
    throw new ApiError(502, result.message || 'AI service failed to train feed model');
  }

  res.status(200).json(sendSuccess(200, result.data, 'Feed model trained successfully'));
});

exports.supportQuery = asyncHandler(async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    throw new ApiError(400, 'question is required');
  }

  const result = await aiService.supportQuery(question);
  if (!result.success) {
    throw new ApiError(502, result.message || 'AI support service failed');
  }

  res.status(200).json(sendSuccess(200, result.data, 'Support answer retrieved successfully'));
});

exports.trainSupport = asyncHandler(async (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new ApiError(400, 'Support training entries are required');
  }

  const result = await aiService.trainSupport(entries);
  if (!result.success) {
    throw new ApiError(502, result.message || 'AI support training failed');
  }

  res.status(200).json(sendSuccess(200, result.data, 'Support model trained successfully'));
});

exports.getSupportFaqs = asyncHandler(async (req, res) => {
  const result = await aiService.getSupportFaqs();
  if (!result.success) {
    throw new ApiError(502, result.message || 'AI support service failed to retrieve FAQs');
  }

  res.status(200).json(sendSuccess(200, result.data, 'Support FAQs retrieved successfully'));
});
