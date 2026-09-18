const express = require('express')
const { getUsers } = require('../controllers/authController')
const { authMiddleware, isManager, checkPermission } = require('../middleweres/authMiddlewere')
const { checkSubscription } = require('../middleware/subscriptionMiddleware')
const { requireFeatureAccess, enforceBasicStaffLimit } = require('../middleware/featureAuthorization')
const { asyncHandler } = require('../middleware/errorHandler')
const {
  userData,
  addUser,
  getStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  updateBalance,
  getAllUsers,
  getUserById,
  updateUserRole,
  suspendUser,
  activateUser,
  deleteUser,
} = require('../controllers/userController')

const {addStaff} = require('../controllers/staffController')

const router = express.Router()

router.get('/userData', authMiddleware, asyncHandler(userData))
router.get('/users', authMiddleware, checkSubscription, asyncHandler(getUsers))
router.post('/staff', authMiddleware, checkSubscription, requireFeatureAccess('staff'), isManager, enforceBasicStaffLimit, checkPermission('staff'), asyncHandler(addUser))
router.get('/staff/list', authMiddleware, checkSubscription, requireFeatureAccess('staff'), isManager, checkPermission('staff'), asyncHandler(getStaff))
router.get('/staff/:id', authMiddleware, checkSubscription, requireFeatureAccess('staff'), isManager, checkPermission('staff'), asyncHandler(getStaffById))
router.put('/staff/:id', authMiddleware, checkSubscription, requireFeatureAccess('staff'), isManager, checkPermission('staff'), asyncHandler(updateStaff))
router.delete('/staff/:id', authMiddleware, checkSubscription, requireFeatureAccess('staff'), isManager, checkPermission('staff'), asyncHandler(deleteStaff))

router.put('/balance', authMiddleware, checkSubscription, asyncHandler(updateBalance))
router.get('/all', authMiddleware, checkSubscription, asyncHandler(getAllUsers))
router.get('/profile/:id', authMiddleware, checkSubscription, asyncHandler(getUserById))
router.put('/role/:id', authMiddleware, checkSubscription, isManager, asyncHandler(updateUserRole))
router.put('/suspend/:id', authMiddleware, checkSubscription, isManager, asyncHandler(suspendUser))
router.put('/activate/:id', authMiddleware, checkSubscription, isManager, asyncHandler(activateUser))
router.delete('/delete/:id', authMiddleware, checkSubscription, isManager, asyncHandler(deleteUser))

module.exports = router