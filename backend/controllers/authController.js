const authModel = require('../models/auth');
const RefreshToken = require('../models/refreshToken');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const trasporter = require('../nodemailer/trasporter');
const bcrypt = require('bcryptjs');
const winston = require('winston');
const { body, validationResult } = require('express-validator');
const { validate, emailValidation, passwordValidation, nameValidation } = require('../middleweres/validation');

// Logger instance (assuming it's set up in index.js)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Helper function to check if account is locked
const isAccountLocked = (user) => {
  return user.lockUntil && user.lockUntil > Date.now();
};

// Helper function to generate tokens
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      userType: user.userType,
      farmId: user.farmId,
      permissions: user.permissions,
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Helper function to log auth events
const logAuthEvent = (event, userId, farmId, ip, userAgent, details = {}) => {
  logger.info(`Auth Event: ${event}`, {
    userId,
    farmId,
    ip,
    userAgent,
    ...details
  });
};

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = {};
      errors.array().forEach(error => {
        formattedErrors[error.param] = error.msg;
      });
      return res.status(400).json({ success: false, message: 'Validation failed', errors: formattedErrors });
    }

    const { name, email, password } = req.body;

    const existingUser = await authModel.findOne({ email });
    if (existingUser) {
      logAuthEvent('registration_failed', null, null, req.ip, req.get('User-Agent'), { reason: 'user_exists', email });
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const userCount = await authModel.countDocuments();
    if (userCount > 1000) {
      return res.status(403).json({ success: false, message: 'Registration is restricted. Please ask your manager to create your staff account.' });
    }
    const role = userCount === 0 ? 'admin' : 'manager';
    const hashPassword = await bcrypt.hash(password, 12);
    const farmId = new mongoose.Types.ObjectId();
    const defaultPermissions = ['dashboard', 'livestock', 'poultry', 'feed', 'sales', 'expenses', 'staff', 'reports', 'settings'];

    const user = new authModel({
      name,
      email,
      password: hashPassword,
      role: role,
      userType: 'manager',
      farmId: farmId.toString(),
      permissions: defaultPermissions,
      createdBy: null,
    });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otphash = await bcrypt.hash(otp, 12);
    user.verificationOtp = otphash;
    user.verificationOtpExpiresAt = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Create farm database and initialize collections
    try {
      const { getFarmConnection } = require('../utils/dbManager');
      const { getModels } = require('../utils/modelFactory');

      const connection = await getFarmConnection(farmId.toString());
      const farmModels = getModels(connection);

      // Initialize collections
      await farmModels.Feed.createCollection();
      await farmModels.Poultry.createCollection();
      await farmModels.LiveStock.createCollection();
      await farmModels.Sells.createCollection();

      logger.info(`Farm database initialized for farmId: ${farmId}`);
    } catch (dbError) {
      logger.error('Error initializing farm database:', dbError);
      // Don't fail registration if DB init fails, but log it
    }

    const accessToken = generateAccessToken(user);
    const refreshTokenValue = generateRefreshToken();
    const refreshTokenHash = await RefreshToken.hashToken(refreshTokenValue);

    const refreshTokenDoc = new RefreshToken({
      userId: user._id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    await refreshTokenDoc.save();

    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const mailOption = {
      from: process.env.SENDER_MAIL,
      to: email,
      subject: 'ACCOUNT VERIFICATION OTP',
      text: `Hello ${name}, your verification otpCode is: ${otp} please verified your account using this otpcode`,
    };

    await trasporter.sendMail(mailOption);

    logAuthEvent('registration_success', user._id, user.farmId, req.ip, req.get('User-Agent'), { email });

    return res.status(201).json({
      success: true,
      message: 'Manager registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        userType: user.userType,
        farmId: user.farmId,
        permissions: user.permissions,
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    logAuthEvent('registration_error', null, null, req.ip, req.get('User-Agent'), { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = {};
      errors.array().forEach(error => {
        formattedErrors[error.param] = error.msg;
      });
      return res.status(400).json({ success: false, message: 'Validation failed', errors: formattedErrors });
    }

    const { email, password } = req.body;

    const user = await authModel.findOne({ email });
    if (!user) {
      logAuthEvent('login_failed', null, null, req.ip, req.get('User-Agent'), { reason: 'user_not_found', email });
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      logAuthEvent('login_failed', user._id, user.farmId, req.ip, req.get('User-Agent'), { reason: 'account_locked', remainingMinutes: remainingTime });
      return res.status(423).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${remainingTime} minutes.`
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment login attempts
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 30 * 60 * 1000; // Lock for 30 minutes
        logAuthEvent('account_locked', user._id, user.farmId, req.ip, req.get('User-Agent'), { attempts: user.loginAttempts });
      }

      await user.save();
      logAuthEvent('login_failed', user._id, user.farmId, req.ip, req.get('User-Agent'), { reason: 'invalid_password', attempts: user.loginAttempts });
      return res.status(400).json({ success: false, message: 'Invalid Credentials' });
    }

    // Reset login attempts on successful login
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();

      const accessToken = generateAccessToken(user);
      const refreshTokenValue = generateRefreshToken();
      const refreshTokenHash = await RefreshToken.hashToken(refreshTokenValue);

      const refreshTokenDoc = new RefreshToken({
        userId: user._id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      await refreshTokenDoc.save();

      res.cookie('token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', refreshTokenValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      logAuthEvent('login_success', user._id, user.farmId, req.ip, req.get('User-Agent'));

      res.status(200).json({
        success: true,
        message: 'Login Successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          userType: user.userType,
          farmId: user.farmId,
          permissions: user.permissions,
        },
      });
    } catch (error) {
      console.log(error);
      logAuthEvent('login_error', null, null, req.ip, req.get('User-Agent'), { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
};

exports.refresh = async (req, res) => {
  try {
    const refreshTokenValue = req.cookies.refreshToken;

    if (!refreshTokenValue) {
      logAuthEvent('refresh_failed', null, null, req.ip, req.get('User-Agent'), { reason: 'no_refresh_token' });
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    // Find the refresh token in database
    const refreshTokenDoc = await RefreshToken.findOne({
      tokenHash: { $exists: true },
      expiresAt: { $gt: new Date() }
    });

    if (!refreshTokenDoc) {
      logAuthEvent('refresh_failed', null, null, req.ip, req.get('User-Agent'), { reason: 'invalid_refresh_token' });
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Verify the token
    const isValid = await refreshTokenDoc.verifyToken(refreshTokenValue);
    if (!isValid) {
      logAuthEvent('refresh_failed', refreshTokenDoc.userId, null, req.ip, req.get('User-Agent'), { reason: 'token_verification_failed' });
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Get user
    const user = await authModel.findById(refreshTokenDoc.userId);
    if (!user) {
      logAuthEvent('refresh_failed', refreshTokenDoc.userId, null, req.ip, req.get('User-Agent'), { reason: 'user_not_found' });
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Delete old refresh token (one-time use)
    await RefreshToken.findByIdAndDelete(refreshTokenDoc._id);

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshTokenValue = generateRefreshToken();
    const newRefreshTokenHash = await RefreshToken.hashToken(newRefreshTokenValue);

    const newRefreshTokenDoc = new RefreshToken({
      userId: user._id,
      tokenHash: newRefreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    await newRefreshTokenDoc.save();

    // Set new cookies
    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', newRefreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logAuthEvent('token_refresh', user._id, user.farmId, req.ip, req.get('User-Agent'));

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    logAuthEvent('refresh_error', null, null, req.ip, req.get('User-Agent'), { error: error.message });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshTokenValue = req.cookies.refreshToken;

    // Delete refresh token from database if it exists
    if (refreshTokenValue) {
      const refreshTokenDoc = await RefreshToken.findOne({
        tokenHash: { $exists: true },
        expiresAt: { $gt: new Date() }
      });

      if (refreshTokenDoc) {
        const isValid = await refreshTokenDoc.verifyToken(refreshTokenValue);
        if (isValid) {
          await RefreshToken.findByIdAndDelete(refreshTokenDoc._id);
        }
      }
    }

    // Clear cookies
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? 'strict' : 'lax'
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? 'strict' : 'lax'
    });

    logAuthEvent('logout', req.user?.id, req.user?.farmId, req.ip, req.get('User-Agent'));

    res.status(200).json({ success: true, message: "Logout Successful" });
  } catch (error) {
    console.log(error);
    logAuthEvent('logout_error', req.user?.id, req.user?.farmId, req.ip, req.get('User-Agent'), { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifiedOtp = async (req, res) => {
  const {otp}= req.body
  const userId = req.user.id

  if(!otp){
    return res.status(400).json({message:'otp is required...'})
  }
  try {
    const user = await authModel.findById(userId)
    if(!user){
      return res.status(404).json({message:'user not found'})
    }
    if(user.isAccountVerified === true){
      return res.status(400).json({message:'Account Already Verified'})
    }
  
    if(user.verificationOtpExpiresAt < Date.now()){
      return res.status(400).json({message:'otp expired'})
    }
    const isMatch = await bcrypt.compare(otp,user.verificationOtp)
    if(!isMatch){
      return res.status(400).json({message:'invalid otp code'})
    }else{
      user.isAccountVerified = true,
      user.verificationOtp = '',
      user.verificationOtpExpiresAt = 0
    }
    await user.save()
    res.status(200).json({message:'Account Verified Successful'})

  } catch (error) {
     console.log(error)
    res.status(500).json({message:error.message})
  }
}

exports.getUsers = async(req,res)=>{
  try {
    if (!req.user || (req.user.userType !== 'manager' && req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'Forbidden: Manager access only' })
    }
    const query = req.user.role === 'admin' ? {} : { farmId: req.user.farmId }
    const users = await authModel.find(query).select('-password -verificationOtp -resetPassword -loginAttempts -lockUntil')
    return res.status(200).json({ users })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}


exports.resendOtp = async(req,res)=>{
   const userId = req.user.id
  try {
    const user = await authModel.findById(userId)
    if(!user){
      return res.status(404).json({message:'user not found'})
    }
    if(user.isAccountVerified === true){
      return res.status(400).json({message:'Account Already Verified'})
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const otphash = await bcrypt.hash(otp,12)
    user.verificationOtp = otphash,
    user.verificationOtpExpiresAt = Date.now() + 10 * 60 * 1000
    await user.save()
    const mailOption = {
      from:process.env.SENDER_MAIL,
      to:user.email,
      subject:"Resend ACCOUNT VERIFICATION OTP",
      text:`Hello ${user.name}, your verification otpCode is: ${otp} please verified your account using this otpcode`
    }
    await trasporter.sendMail(mailOption)
    res.status(200).json({message:'OTP Resend Successful'})
  } catch (error) {
    console.log(error)
    res.status(500).json({message:error.message})
  }
}


exports.forgotPasswordOtp = async(req,res)=>{
  const {email} = req.body
  if(!email){
    return res.status(400).json({message:'email is required...'})
  }
  try {
    const user = await authModel.findOne({email})
    if(!user){
      return res.status(404).json({message:'user not found'})
    }
    const resetOtp = String(Math.floor(100000 + Math.random() * 900000))
   const resetOtpHash = await bcrypt.hash(resetOtp,12)
    user.resetPassword = resetOtpHash,
    user.resetPasswordExpiresAt = Date.now() + 10 * 60 * 1000
    await user.save()
    const mailOption = {
      from:process.env.SENDER_MAIL,
      to:email,
      subject:"Reset Password Otp Code",
      text:`Your Reset Otp Code is :${resetOtp} Reset your password using this Otp code`
    }
    await trasporter.sendMail(mailOption)
    res.status(200).json({message:'Reset Password Send Successful..'})
  } catch (error) {
     console.log(error)
    res.status(500).json({message:error.message})
  }
}

exports.resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = {};
      errors.array().forEach(error => {
        formattedErrors[error.param] = error.msg;
      });
      return res.status(400).json({ success: false, message: 'Validation failed', errors: formattedErrors });
    }

    const { email, otp, newPassword } = req.body;

    const user = await authModel.findOne({ email });
    if (!user) {
      logAuthEvent('password_reset_failed', null, null, req.ip, req.get('User-Agent'), { reason: 'user_not_found' });
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPassword);
    if (!isMatch) {
      logAuthEvent('password_reset_failed', user._id, user.farmId, req.ip, req.get('User-Agent'), { reason: 'invalid_otp' });
      return res.status(400).json({ success: false, message: "Invalid OTP Code" });
    }

    if (user.resetPasswordExpiresAt < Date.now()) {
      logAuthEvent('password_reset_failed', user._id, user.farmId, req.ip, req.get('User-Agent'), { reason: 'otp_expired' });
      return res.status(400).json({ success: false, message: "Reset Password OTP Code Expired" });
    }

    if (!user.resetPassword || user.resetPassword === '') {
      return res.status(400).json({ success: false, message: "Please Request for Reset Password OTP Code" });
    }

    const hashNewPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashNewPassword;
    user.resetPassword = '';
    user.resetPasswordExpiresAt = 0;
    await user.save();

    logAuthEvent('password_reset_success', user._id, user.farmId, req.ip, req.get('User-Agent'));

    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.log(error);
    logAuthEvent('password_reset_error', null, null, req.ip, req.get('User-Agent'), { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};
