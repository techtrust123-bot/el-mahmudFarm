const express = require('express')
const { getUsers } = require('../controllers/authController')
const { authMiddleware } = require('../middleweres/authMiddlewere')
const { userData } = require('../controllers/userController')
const router = express.Router()

router.get('/userData',authMiddleware, userData)
router.get('/users',authMiddleware, getUsers)
router.get('/:id',authMiddleware, getUsers) 
router.delete('/del/:id',authMiddleware, getUsers)

module.exports = router