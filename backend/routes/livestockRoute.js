const express = require('express')
const { createLiveStock, getLivestocks, getAvailableLivestock, getSoldLivestock, getLiveStockById, edit, remove } = require('../controllers/livestockController')
const { authMiddleware, checkPermission } = require('../middleweres/authMiddlewere')
const { checkSubscription } = require('../middleware/subscriptionMiddleware')
const { attachFarmDB } = require("../middleware/dbMiddleware")
const { validate } = require('../middleweres/validation')
const { livestockValidation } = require('../middleweres/controllerValidation')
const { asyncHandler } = require('../middleware/errorHandler')
const router = express.Router()

// Routes
router.post('/add-animal', 
  authMiddleware, 
  checkSubscription, 
  attachFarmDB, 
  checkPermission('livestock'), 
  validate(livestockValidation),
  asyncHandler(createLiveStock)
)

router.get('/list', 
  authMiddleware, 
  checkSubscription, 
  attachFarmDB, 
  checkPermission('livestock'), 
  asyncHandler(getLivestocks)
)

router.get('/available', 
  authMiddleware, 
  checkSubscription, 
  attachFarmDB, 
  checkPermission('livestock'), 
  asyncHandler(getAvailableLivestock)
)

router.get('/sold', 
  authMiddleware, 
  checkSubscription, 
  attachFarmDB, 
  checkPermission('livestock'), 
  asyncHandler(getSoldLivestock)
)

router.get('/:id', 
  authMiddleware, 
  checkSubscription, 
  attachFarmDB, 
  checkPermission('livestock'), 
  asyncHandler(getLiveStockById)
)

router.put('/edit/:id', 
  authMiddleware, 
  checkSubscription, 
  attachFarmDB, 
  checkPermission('livestock'), 
  validate(livestockValidation),
  asyncHandler(edit)
)

router.delete('/:id', 
  authMiddleware, 
  checkSubscription, 
  attachFarmDB, 
  checkPermission('livestock'), 
  asyncHandler(remove)
)

module.exports = router