const express = require('express')
const { getUsers } = require('../controllers/authController')
const { authMiddleware, isManager } = require('../middleweres/authMiddlewere')
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
router.get('/users', authMiddleware, getUsers)
router.post('/staff', authMiddleware, isManager, addStaff)
router.get('/staff/list', authMiddleware, isManager, getStaff)
router.get('/staff/:id', authMiddleware, isManager, getStaffById)
router.put('/staff/:id', authMiddleware, isManager, updateStaff)
router.delete('/staff/:id', authMiddleware, isManager, deleteStaff)

router.put('/balance', authMiddleware, updateBalance)
router.get('/all', authMiddleware, getAllUsers)
router.get('/profile/:id', authMiddleware, getUserById)
router.put('/role/:id', authMiddleware, isManager, updateUserRole)
router.put('/suspend/:id', authMiddleware, isManager, suspendUser)
router.put('/activate/:id', authMiddleware, isManager, activateUser)
router.delete('/delete/:id', authMiddleware, isManager, deleteUser)

module.exports = router