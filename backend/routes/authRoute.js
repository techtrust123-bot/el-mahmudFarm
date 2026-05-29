const express = require('express');
const { register, login, logout, refresh, verifiedOtp, getUsers, resendOtp, resetPassword, forgotPasswordOtp } = require('../controllers/authController');
const { authMiddleware } = require('../middleweres/authMiddlewere');
const { validate, emailValidation, passwordValidation, newPasswordValidation, nameValidation } = require('../middleweres/validation');
const { body } = require('express-validator');
const router = express.Router();

router.post('/register', validate([nameValidation, emailValidation, passwordValidation]), register);
router.post('/login', validate([emailValidation, body('password').notEmpty().withMessage('Password is required')]), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/verified', authMiddleware, verifiedOtp);
router.post('/resend-otp', authMiddleware, resendOtp);
router.get('/', getUsers);
router.post('/reset-password', validate([emailValidation, body('otp').notEmpty().withMessage('OTP is required'), newPasswordValidation]), resetPassword);
router.post('/send-reset-otp', validate([emailValidation]), forgotPasswordOtp);

module.exports = router;