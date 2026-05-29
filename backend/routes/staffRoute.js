const express = require('express');
const { addStaff, getStaff, updateStaff, deleteStaff, getStaffById } = require('../controllers/staffController');
const { authMiddleware, isManager } = require('../middleweres/authMiddlewere');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');
const { attachFarmDB } = require("../middleware/dbMiddleware");
const { validate } = require('../middleweres/validation')
const { staffValidation } = require('../middleweres/controllerValidation')
const { asyncHandler } = require('../middleware/errorHandler')
const router = express.Router();

router.post('/add-staff', authMiddleware, checkSubscription, attachFarmDB, isManager, validate(staffValidation), asyncHandler(addStaff))
router.get('/list', authMiddleware, checkSubscription, attachFarmDB, isManager, asyncHandler(getStaff))
router.put('/edit/:id', authMiddleware, checkSubscription, attachFarmDB, isManager, validate(staffValidation), asyncHandler(updateStaff))
router.delete('/del/:id', authMiddleware, checkSubscription, attachFarmDB, isManager, asyncHandler(deleteStaff))
router.get('/:id', authMiddleware, checkSubscription, attachFarmDB, isManager, asyncHandler(getStaffById))

module.exports = router