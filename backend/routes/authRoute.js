const express = require('express');
const { register, login, logout, refresh, verifiedOtp, getUsers, resendOtp, resetPassword, forgotPasswordOtp } = require('../controllers/authController');
const { authMiddleware } = require('../middleweres/authMiddlewere');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, emailValidation, passwordValidation, newPasswordValidation, nameValidation } = require('../middleweres/validation');
const { body } = require('express-validator');
const router = express.Router();

router.post('/register', validate([nameValidation, emailValidation, passwordValidation]), asyncHandler(register));
router.post('/login', validate([emailValidation, body('password').notEmpty().withMessage('Password is required')]), asyncHandler(login));
router.post('/refresh', asyncHandler(refresh));
router.post('/logout', asyncHandler(logout));
router.post('/verified', authMiddleware, asyncHandler(verifiedOtp));
router.post('/resend-otp', authMiddleware, asyncHandler(resendOtp));
router.get('/', asyncHandler(getUsers));
router.post('/reset-password', validate([emailValidation, body('otp').notEmpty().withMessage('OTP is required'), newPasswordValidation]), asyncHandler(resetPassword));
router.post('/send-reset-otp', validate([emailValidation]), asyncHandler(forgotPasswordOtp));

module.exports = router;