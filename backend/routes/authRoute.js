const express = require('express');
const { register, login, logout, verifiedOtp, getUsers, resendOtp, resetPassword, forgotPasswordOtp } = require('../controllers/authController');
const { authMiddleware } = require('../middleweres/authMiddlewere');
const router = express.Router();


router.post('/register',register)
router.post('/login',login)
router.post('/logout',logout)
router.post('/verified',authMiddleware,verifiedOtp)
router.post('/resend-otp',authMiddleware,resendOtp)
router.get('/',getUsers)
router.post('/reset-password', resetPassword)
router.post('/send-reset-otp',forgotPasswordOtp)

module.exports = router;