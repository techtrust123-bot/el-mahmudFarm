const express = require('express');
const { getSells, getById, edit, remove, recordSales, getSaleInventory } = require('../controllers/sellsController');
const { authMiddleware, checkPermission, isManager } = require('../middleweres/authMiddlewere');
const { checkSubscription } = require('../middleware/subscriptionMiddleware')
const { requireFeatureAccess } = require('../middleware/featureAuthorization')
const { attachFarmDB } = require('../middleware/dbMiddleware');
const { validate } = require('../middleweres/validation')
const { salesValidation } = require('../middleweres/controllerValidation')
const { asyncHandler } = require('../middleware/errorHandler')
const { auditMiddleware } = require('../middleware/auditLogger')
const router = express.Router()
router.post('/add', authMiddleware, checkSubscription, requireFeatureAccess('sales'), attachFarmDB, checkPermission('sales'), validate(salesValidation), auditMiddleware('CREATE_SALE', 'sales'), asyncHandler(recordSales))
router.get('/inventory', authMiddleware, checkSubscription, requireFeatureAccess('sales'), attachFarmDB, checkPermission('sales'), asyncHandler(getSaleInventory))
router.get('/list', authMiddleware, checkSubscription, requireFeatureAccess('sales'), attachFarmDB, checkPermission('sales'), asyncHandler(getSells))
router.put('/edit/:id', authMiddleware, isManager, checkSubscription, requireFeatureAccess('sales'), attachFarmDB, checkPermission('sales'), validate(salesValidation), auditMiddleware('UPDATE_SALE', 'sales'), asyncHandler(edit))
router.get('/:id', authMiddleware, checkSubscription, requireFeatureAccess('sales'), attachFarmDB, checkPermission('sales'), asyncHandler(getById))
router.delete('/del/:id', authMiddleware, isManager, checkSubscription, requireFeatureAccess('sales'), attachFarmDB, checkPermission('sales'), auditMiddleware('DELETE_SALE', 'sales'), asyncHandler(remove))
module.exports = router