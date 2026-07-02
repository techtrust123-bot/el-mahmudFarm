const express = require('express');
const {
  predictFeed,
  trainFeedModel,
  supportQuery,
  trainSupport,
  getSupportFaqs,
} = require('../controllers/aiController');
const { authMiddleware, isManager } = require('../middleweres/authMiddlewere');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.post('/predict/feed', authMiddleware, asyncHandler(predictFeed));
router.post('/train/feed', authMiddleware, isManager, asyncHandler(trainFeedModel));
router.post('/support/query', authMiddleware, asyncHandler(supportQuery));
router.post('/support/train', authMiddleware, isManager, asyncHandler(trainSupport));
router.get('/support/faqs', authMiddleware, asyncHandler(getSupportFaqs));

module.exports = router;
