const express = require('express')
const { getFeed, getById, addFeed, edit, del } = require("../controllers/feedController")
const { authMiddleware, checkPermission, isManager } = require("../middleweres/authMiddlewere")
const { checkSubscription } = require('../middleware/subscriptionMiddleware')
const { requireFeatureAccess } = require('../middleware/featureAuthorization')
const { attachFarmDB } = require("../middleware/dbMiddleware")
const { validate } = require('../middleweres/validation')
const { feedValidation } = require('../middleweres/controllerValidation')
const { asyncHandler } = require('../middleware/errorHandler')
const router = express.Router()

router.post('/add-feed', authMiddleware, checkSubscription, requireFeatureAccess('feed'), attachFarmDB, checkPermission('feed'), validate(feedValidation), asyncHandler(addFeed))
router.get('/feed', authMiddleware, checkSubscription, requireFeatureAccess('feed'), attachFarmDB, checkPermission('feed'), asyncHandler(getFeed))
router.put('/edit/:id', authMiddleware,isManager, checkSubscription, requireFeatureAccess('feed'), attachFarmDB, checkPermission('feed'), validate(feedValidation), asyncHandler(edit))
router.get('/:id', authMiddleware, checkSubscription, requireFeatureAccess('feed'), attachFarmDB, checkPermission('feed'), asyncHandler(getById))
router.delete('/del-feed/:id', authMiddleware,isManager, checkSubscription, requireFeatureAccess('feed'), attachFarmDB, checkPermission('feed'), asyncHandler(del))

module.exports = router