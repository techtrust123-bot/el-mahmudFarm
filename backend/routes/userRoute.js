const express = require('express')
const { getUsers } = require('../controllers/authController')
const { authMiddleware, isManager } = require('../middleweres/authMiddlewere')
const { checkSubscription } = require('../middleware/subscriptionMiddleware')
const { asyncHandler } = require('../middleware/errorHandler')
const {
  userData,
  addStaff,
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
const router = express.Router()

router.get('/userData', authMiddleware, asyncHandler(userData))
router.get('/users', authMiddleware, checkSubscription, asyncHandler(getUsers))
router.post('/staff', authMiddleware, checkSubscription, isManager, asyncHandler(addStaff))
router.get('/staff/list', authMiddleware, checkSubscription, isManager, asyncHandler(getStaff))
router.get('/staff/:id', authMiddleware, checkSubscription, isManager, asyncHandler(getStaffById))
router.put('/staff/:id', authMiddleware, checkSubscription, isManager, asyncHandler(updateStaff))
router.delete('/staff/:id', authMiddleware, checkSubscription, isManager, asyncHandler(deleteStaff))

router.put('/balance', authMiddleware, checkSubscription, asyncHandler(updateBalance))
router.get('/all', authMiddleware, checkSubscription, asyncHandler(getAllUsers))
router.get('/profile/:id', authMiddleware, checkSubscription, asyncHandler(getUserById))
router.put('/role/:id', authMiddleware, checkSubscription, isManager, asyncHandler(updateUserRole))
router.put('/suspend/:id', authMiddleware, checkSubscription, isManager, asyncHandler(suspendUser))
router.put('/activate/:id', authMiddleware, checkSubscription, isManager, asyncHandler(activateUser))
router.delete('/delete/:id', authMiddleware, checkSubscription, isManager, asyncHandler(deleteUser))

module.exports = router