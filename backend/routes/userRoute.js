const express = require('express')
const { getUsers } = require('../controllers/authController')
const { authMiddleware, isManager } = require('../middleweres/authMiddlewere')
const { checkSubscription } = require('../middleware/subscriptionMiddleware')
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

router.get('/userData', authMiddleware, userData)
router.get('/users', authMiddleware, checkSubscription, getUsers)
router.post('/staff', authMiddleware, checkSubscription, isManager, addStaff)
router.get('/staff/list', authMiddleware, checkSubscription, isManager, getStaff)
router.get('/staff/:id', authMiddleware, checkSubscription, isManager, getStaffById)
router.put('/staff/:id', authMiddleware, checkSubscription, isManager, updateStaff)
router.delete('/staff/:id', authMiddleware, checkSubscription, isManager, deleteStaff)

router.put('/balance', authMiddleware, checkSubscription, updateBalance)
router.get('/all', authMiddleware, checkSubscription, getAllUsers)
router.get('/profile/:id', authMiddleware, checkSubscription, getUserById)
router.put('/role/:id', authMiddleware, checkSubscription, isManager, updateUserRole)
router.put('/suspend/:id', authMiddleware, checkSubscription, isManager, suspendUser)
router.put('/activate/:id', authMiddleware, checkSubscription, isManager, activateUser)
router.delete('/delete/:id', authMiddleware, checkSubscription, isManager, deleteUser)

module.exports = router