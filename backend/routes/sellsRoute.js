const express = require('express');
const { getSells, getById, edit, remove, recordSales } = require('../controllers/sellsController');
const { authMiddleware, checkPermission, isManager } = require('../middleweres/authMiddlewere');
const { checkSubscription } = require('../middleware/subscriptionMiddleware')
const { attachFarmDB } = require('../middleware/dbMiddleware');
const { validate } = require('../middleweres/validation')
const { salesValidation } = require('../middleweres/controllerValidation')
const { asyncHandler } = require('../middleware/errorHandler')
const { auditMiddleware } = require('../middleware/auditLogger')
const router = express.Router()
router.post('/add', authMiddleware, checkSubscription, attachFarmDB, checkPermission('sales'), validate(salesValidation), auditMiddleware('CREATE_SALE', 'sales'), asyncHandler(recordSales))
router.get('/list', authMiddleware, checkSubscription, attachFarmDB, checkPermission('sales'), asyncHandler(getSells))
router.put('/edit/:id', authMiddleware, isManager, checkSubscription, attachFarmDB, checkPermission('sales'), validate(salesValidation), auditMiddleware('UPDATE_SALE', 'sales'), asyncHandler(edit))
router.get('/:id', authMiddleware, checkSubscription, attachFarmDB, checkPermission('sales'), asyncHandler(getById))
router.delete('/del/:id', authMiddleware, isManager, checkSubscription, attachFarmDB, checkPermission('sales'), auditMiddleware('DELETE_SALE', 'sales'), asyncHandler(remove))
module.exports = router