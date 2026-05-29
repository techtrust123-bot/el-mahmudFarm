const { getFeed, getById, addFeed, edit, del } = require("../controllers/feedController")

const express = require('express')
const { authMiddleware, checkPermission } = require("../middleweres/authMiddlewere")
const { checkSubscription } = require('../middleware/subscriptionMiddleware')
const { attachFarmDB } = require("../middleware/dbMiddleware")
const { validate } = require('../middleweres/validation')
const { feedValidation } = require('../middleweres/controllerValidation')
const { asyncHandler } = require('../middleware/errorHandler')
const router = express.Router()

router.post('/add-feed', authMiddleware, checkSubscription, attachFarmDB, checkPermission('feed'), validate(feedValidation), asyncHandler(addFeed))
router.get('/feed', authMiddleware, checkSubscription, attachFarmDB, checkPermission('feed'), asyncHandler(getFeed))
router.put('/edit/:id', authMiddleware, checkSubscription, attachFarmDB, checkPermission('feed'), validate(feedValidation), asyncHandler(edit))
router.get('/:id', authMiddleware, checkSubscription, attachFarmDB, checkPermission('feed'), asyncHandler(getById))
router.delete('/del-feed/:id', authMiddleware, checkSubscription, attachFarmDB, checkPermission('feed'), asyncHandler(del))

module.exports = router