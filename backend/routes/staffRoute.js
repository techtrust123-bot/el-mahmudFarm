const express = require('express');
const { addStaff, getStaff, updateStaff, deleteStaff, getStaffById } = require('../controllers/staffController');
const { authMiddleware, isManager } = require('../middleweres/authMiddlewere');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');
const { attachFarmDB } = require('../middleware/dbMiddleware');
const { validate } = require('../middleweres/validation')
const { staffValidation } = require('../middleweres/controllerValidation')
const { asyncHandler } = require('../middleware/errorHandler')
const { auditMiddleware } = require('../middleware/auditLogger')
const router = express.Router()
router.post('/add-staff', authMiddleware, checkSubscription, attachFarmDB, isManager, validate(staffValidation), auditMiddleware('CREATE_STAFF', 'staff'), asyncHandler(addStaff))
router.get('/list', authMiddleware, checkSubscription, attachFarmDB, isManager, asyncHandler(getStaff))
router.put('/edit/:id', authMiddleware, checkSubscription, attachFarmDB, isManager, validate(staffValidation), auditMiddleware('UPDATE_STAFF', 'staff'), asyncHandler(updateStaff))
router.delete('/del/:id', authMiddleware, checkSubscription, attachFarmDB, isManager, auditMiddleware('DELETE_STAFF', 'staff'), asyncHandler(deleteStaff))
router.get('/:id', authMiddleware, checkSubscription, attachFarmDB, isManager, asyncHandler(getStaffById))

module.exports = router