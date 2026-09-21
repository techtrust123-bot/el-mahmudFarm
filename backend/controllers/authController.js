const authModel = require('../models/auth.js');
const RefreshToken = require('../models/refreshToken');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const winston = require('winston');
const { body, validationResult } = require('express-validator');
const { validate, emailValidation, passwordValidation, nameValidation } = require('../middleweres/validation');
const ApiError = require('../utils/ApiError');
const { sendNotification } = require('../services/emailService');

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

    const { name, email, password, farmName, phone, address, city } = req.body;

    const existingUser = await authModel.findOne({ email });
    if (existingUser) {
      logAuthEvent('registration_failed', null, null, req.ip, req.get('User-Agent'), { reason: 'user_exists', email });
      // return res.status(400).json({ success: false, message: 'User already exists' });
      throw new ApiError(400, 'User already exists');
    }

    const userCount = await authModel.countDocuments();
    // if (userCount > 1000) {
    //   return res.status(403).json({ success: false, message: 'Registration is restricted. Please ask your manager to create your staff account.' });
    // }
    const role = userCount === 0 ? 'admin' : 'manager';
    const hashPassword = await bcrypt.hash(password, 12);
    const farmId = new mongoose.Types.ObjectId();
    const defaultPermissions = ['dashboard', 'livestock', 'poultry', 'feed', 'eggInventory', 'sales', 'expenses', 'staff', 'reports', 'settings'];
    const trialDays = role === 'admin' ? 3650 : role === 'manager' ? 14 : 0;
    const trialStart = trialDays > 0 ? new Date() : null;
    const trialEnd = trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null;
    const isTrial = trialDays > 0;
    const trialPlan = 'free';
    const trialBillingCycle = 'none';

    const user = new authModel({
      name,
      email,
      farmName,
      phone,
      address,
      city,
      password: hashPassword,
      role: role,
      userType: role === 'admin' ? 'admin' : 'manager',
      farmId: farmId.toString(),
      permissions: defaultPermissions,
      createdBy: null,
      subscriptionStatus: isTrial ? 'trial' : 'inactive',
      subscriptionType: isTrial ? 'trial' : 'none',
      subscriptionStart: trialStart,
      subscriptionEnd: trialEnd,
      isSubscribed: isTrial,
      subscriptionPlan: trialPlan,
      billingCycle: trialBillingCycle
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
      maxAge: 30 * 60 * 1000, // 30 minutes
    });

    res.cookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    await sendNotification(email, 'OTP', {
      userName: name,
      otp
    });

    await sendNotification(email, 'WELCOME', {
      userName: name
    });

    logAuthEvent('registration_success', user._id, user.farmId, req.ip, req.get('User-Agent'), { email });

    return res.status(201).json({
      success: true,
      message: 'Manager registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        farmName: user.farmName,
        phone: user.phone,
        address: user.address,
        city: user.city,
        role: user.role,
        userType: user.userType,
        farmId: user.farmId,
        permissions: user.permissions,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionType: user.subscriptionType,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd,
        isSubscribed: user.isSubscribed,
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Error registering user:', error);
    logAuthEvent('registration_error', null, null, req.ip, req.get('User-Agent'), { error: error.message });
    throw new ApiError(500, 'Internal server error');
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
      throw new ApiError(400, 'Validation failed', formattedErrors);
    }
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = await authModel.findOne({
      $expr: {
        $eq: [
          { $toLower: { $trim: { input: '$email' } } },
          normalizedEmail,
        ],
      },
    });
    if (!user) {
      logAuthEvent('login_failed', null, null, req.ip, req.get('User-Agent'), { reason: 'user_not_found', email: normalizedEmail });
      // return res.status(404).json({ success: false, message: 'User not found' });
      throw new ApiError(404, 'User not found');
    }

    // const verifiedAccount = await authModel.findOne({ email: normalizedEmail, isAccountVerified: true });
    // if (!user.isAccountVerified) {
    //   logAuthEvent('login_failed', user._id, user.farmId, req.ip, req.get('User-Agent'), { reason: 'account_not_verified' });
    //   return res.status(403).json({ success: false, message: 'Account not verified. Please verify your account before logging in.' });
    // }

    // Check if account is locked
    if (isAccountLocked(user)) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      logAuthEvent('login_failed', user._id, user.farmId, req.ip, req.get('User-Agent'), { reason: 'account_locked', remainingMinutes: remainingTime });
      return res.status(423).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${remainingTime} minutes.`
      });
      throw new ApiError(423, `Account locked due to too many failed attempts. Try again in ${remainingTime} minutes.`);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment login attempts
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 30 * 60 * 1000; // Lock for 30 minutes
        logAuthEvent('account_locked', user._id, user.farmId, req.ip, req.get('User-Agent'), { attempts: user.loginAttempts });
        throw new ApiError(423, 'Account locked due to too many failed attempts. Try again later.');
      }

      await user.save();
      logAuthEvent('login_failed', user._id, user.farmId, req.ip, req.get('User-Agent'), { reason: 'invalid_password', attempts: user.loginAttempts });
      // return res.status(400).json({ success: false, message: 'Invalid Credentials' });
      throw new ApiError(400, 'Invalid Credentials');
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
        maxAge: 30 * 60 * 1000, // 30 minutes
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
          farmName: user.farmName,
          phone: user.phone,
          address: user.address,
          city: user.city,
          permissions: user.permissions,
          isAccountVerified: user.isAccountVerified,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionType: user.subscriptionType,
          subscriptionStart: user.subscriptionStart,
          subscriptionEnd: user.subscriptionEnd,
          isSubscribed: user.isSubscribed,
          subscriptionPlan: user.subscriptionPlan,
          billingCycle: user.billingCycle,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Login error:', error, { stack: error.stack });
      throw new ApiError(500, 'Internal server error');
    }
};
exports.refresh = async (req, res) => {
  try {
    const refreshTokenValue = req.cookies.refreshToken;

    if (!refreshTokenValue) {
      logAuthEvent('refresh_failed', null, null, req.ip, req.get('User-Agent'), { reason: 'no_token' });
      return res.status(401).json({ 
        success: false, 
        message: 'Refresh token required', 
        code: 'NO_REFRESH_TOKEN' 
      });
    }

    // Find all valid refresh tokens for the user
    const refreshTokenDocs = await RefreshToken.find({
      expiresAt: { $gt: new Date() }
    });

    let validTokenDoc = null;
    let validUserId = null;

    // Find the matching token
    for (const tokenDoc of refreshTokenDocs) {
      const isValid = await tokenDoc.verifyToken(refreshTokenValue);
      if (isValid) {
        validTokenDoc = tokenDoc;
        validUserId = tokenDoc.userId;
        break;
      }
    }

    if (!validTokenDoc) {
      logAuthEvent('refresh_failed', null, null, req.ip, req.get('User-Agent'), { reason: 'invalid_token' });
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid refresh token', 
        code: 'REFRESH_TOKEN_INVALID' 
      });
    }

    // Get user
    const user = await authModel.findById(validUserId);
    if (!user) {
      logAuthEvent('refresh_failed', validUserId, null, req.ip, req.get('User-Agent'), { reason: 'user_not_found' });
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid refresh token', 
        code: 'REFRESH_TOKEN_INVALID' 
      });
    }

    // Delete old refresh token (one-time use)
    await RefreshToken.findByIdAndDelete(validTokenDoc._id);

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
      maxAge: 30 * 60 * 1000, // 30 minutes
    });

    res.cookie('refreshToken', newRefreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logAuthEvent('refresh_success', user._id, user.farmId, req.ip, req.get('User-Agent'));

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // console.error('Refresh token error:', error);
    logger.error('Refresh token error:', {error,stack: error.stack});
    logAuthEvent('refresh_error', null, null, req.ip, req.get('User-Agent'), { error: error.message });
    throw new ApiError(500, 'Internal server error');
  }
};

exports.logout = (req, res) => {
  // 1. Amsa nan take ba tare da kowa da komai ba (No async/await)
  try {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/"
    };

    res.clearCookie('token', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    return res.status(200).json({ 
      success: true, 
      message: "Logged out successfully" 
    });
  } catch (err) {
    return res.status(200).json({ 
      success: true, 
      message: "Logged out" 
    });
  }
};

// exports.logout = async (req, res) => {
//   try {
//     const isProduction = process.env.NODE_ENV === "production";

//     // 1. Goge Cookies da sauri-sauri (Instant response)
//     res.clearCookie('token', {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: isProduction ? 'strict' : 'lax',
//       path: '/'
//     });

//     res.clearCookie('refreshToken', {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: isProduction ? 'strict' : 'lax',
//       path: '/'
//     });

//     // 2. Mayar da Amsa TSOKANAN BAKI (Instant HTTP 200)
//     res.status(200).json({ success: true, message: "Logout Successful" });

//     // 3. Aikin Async Background (Goge token a DB & Log) - Ayi shi BAYAN an riga an turawa user amsa
//     const refreshTokenValue = req.cookies?.refreshToken;
    
//     if (refreshTokenValue) {
//       RefreshToken.deleteOne({ token: refreshTokenValue }).catch(err => 
//         console.error("Background token delete error:", err)
//       );
//     }

//     try {
//       logAuthEvent('logout', req.user?.id, req.user?.farmId, req.ip, req.get('User-Agent'));
//     } catch (logErr) {
//       console.error("Logging error ignored:", logErr);
//     }

//   } catch (error) {
//     console.error('Logout error:', error);
//     // Maida amsa nan take koda an samu kuskure don hana Timeout
//     return res.status(200).json({ success: true, message: "Logged out" });
//   }
// };

// exports.logout = async (req, res, next) => {
//   try {
//     const refreshTokenValue = req.cookies.refreshToken;

//     // 1. Goge Refresh Token din a database cikin sauri ba tare da Loop ba
//     if (refreshTokenValue) {
//       // Idan kana adana hashed token a DB (Mafi kyau da sauri):
//       // Ko kuma ka goge ta hanyar amfani da req.user._id idan tana da alaka da user
//       if (req.user?.id) {
//         await RefreshToken.deleteMany({ userId: req.user.id });
//       } else {
//         // Idan baka da userId, nemo token guda daya kawai wanda yake aiki
//         await RefreshToken.findOneAndDelete({ token: refreshTokenValue });
//       }
//     }

//     const isProduction = process.env.NODE_ENV === "production";

//     // 2. Clear cookies
//     res.clearCookie('token', {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: isProduction ? 'strict' : 'lax'
//     });

//     res.clearCookie('refreshToken', {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: isProduction ? 'strict' : 'lax'
//     });

//     // Log event
//     logAuthEvent('logout', req.user?.id, req.user?.farmId, req.ip, req.get('User-Agent'));

//     // 3. Mayar da Response Nan Taki
//     return res.status(200).json({ success: true, message: "Logout Successful" });

//   } catch (error) {
//     console.error('Logout error:', error);
//     logAuthEvent('logout_error', req.user?.id, req.user?.farmId, req.ip, req.get('User-Agent'), { error: error.message });

//     // 4. Maimakon 'throw', yi amfani da res.status() ko next() don hana Timeout
//     return res.status(500).json({ 
//       success: false, 
//       message: 'Internal server error during logout' 
//     });
//   }
// };

// exports.logout = async (req, res) => {
//   try {
//     const refreshTokenValue = req.cookies.refreshToken;

//     // Delete refresh token from database if it exists
//     if (refreshTokenValue) {
//       if (req.user?.id) {
//         await RefreshToken.deleteMany({ userId: req.user.id });
//       } else {
//         // Idan baka da userId, nemo token guda daya kawai wanda yake aiki
//         await RefreshToken.findOneAndDelete({ token: refreshTokenValue });
//       }
//       // const refreshTokenDocs = await RefreshToken.find({
//       //   expiresAt: { $gt: new Date() }
//       // });
//       // for (const tokenDoc of refreshTokenDocs) {
//       //   const isValid = await tokenDoc.verifyToken(refreshTokenValue);
//       //   if (isValid) {
//       //     await RefreshToken.findByIdAndDelete(tokenDoc._id);
//       //     break;
//       //   }
//       // }
//     }

//      const isProduction = process.env.NODE_ENV === "production";

//     // Clear cookies
//     res.clearCookie('token', {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: process.env.NODE_ENV === "production" ? 'strict' : 'lax'
//     });

//     res.clearCookie('refreshToken', {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: process.env.NODE_ENV === "production" ? 'strict' : 'lax'
//     });

//     logAuthEvent('logout', req.user?.id, req.user?.farmId, req.ip, req.get('User-Agent'));

//     res.status(200).json({ success: true, message: "Logout Successful" });
//   } catch (error) {
//     console.error('Logout error:', error);
//     logAuthEvent('logout_error', req.user?.id, req.user?.farmId, req.ip, req.get('User-Agent'), { error: error.message });

//     // 4. Maimakon 'throw', yi amfani da res.status() ko next() don hana Timeout
//     return res.status(500).json({ 
//       success: false, 
//       message: 'Internal server error during logout' 
//     });
//   //   if (error instanceof ApiError) {
//   //     throw error;
//   //   }
//   //   // console.log(error);
//   //   logger.error('logout_error', {error, stack: error.stack});
//   //   logAuthEvent('logout_error', req.user?.id, req.user?.farmId, req.ip, req.get('User-Agent'), { error: error.message });
//   //   throw new ApiError(500, 'Internal server error');
//   // }
//   };
// }


exports.verifiedOtp = async (req, res) => {
  const {otp}= req.body
  const userId = req.user.id

  if(!otp){
    throw new ApiError(400, 'OTP is required');
  }
  try {
    const user = await authModel.findById(userId)
    if(!user){
      throw new ApiError(404, 'User not found');
    }
    if(user.isAccountVerified === true){
      throw new ApiError(400, 'Account Already Verified');
    }
  
    if(user.verificationOtpExpiresAt < Date.now()){
      throw new ApiError(400, 'OTP expired');
    }
    const isMatch = await bcrypt.compare(otp,user.verificationOtp)
    if(!isMatch){
      throw new ApiError(400, 'Invalid OTP Code');
    }

    user.isAccountVerified = true;
    user.verificationOtp = '';
    user.verificationOtpExpiresAt = 0;
    await user.save();

    return res.status(200).json({ success: true, message: 'Account Verified Successfull..' });
  } catch (error) {
     if (error instanceof ApiError) {
       throw error;
     }
     logger.error(error.message)
    throw new ApiError(500, 'Internal server error');
  }
}

exports.getUsers = async(req,res)=>{
  try {
    if (!req.user || (req.user.userType !== 'manager' && req.user.role !== 'admin')) {
      throw new ApiError(403, 'Forbidden: Manager access only');
    }
    const query = req.user.role === 'admin' ? {} : { farmId: req.user.farmId }
    const users = await authModel.find(query).select('-password -verificationOtp -resetPassword -loginAttempts -lockUntil')
    return res.status(200).json({ success: true, users })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // console.log(error)
    logger.error('getUsers_error', {error, stack: error.stack});
    throw new ApiError(500, 'Internal server error');
  }
}


exports.resendOtp = async(req,res)=>{
   const userId = req.user.id
  try {
    const user = await authModel.findById(userId)
    if(!user){
      throw new ApiError(404, 'User not found');
    }
    if(user.isAccountVerified === true){
      throw new ApiError(400, 'Account Already Verified');
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const otphash = await bcrypt.hash(otp,12)
    user.verificationOtp = otphash,
    user.verificationOtpExpiresAt = Date.now() + 10 * 60 * 1000
    await user.save()
    await sendNotification(user.email, 'OTP', {
      userName: user.name,
      otp
    });
    res.status(200).json({success:true, message:'OTP Resend Successful'})
  } catch (error) {
    // console.log(error)
    logger.error('resendOtp_error', {error, stack: error.stack});
    throw new ApiError(500, 'Internal server error');
  }
}


exports.forgotPasswordOtp = async(req,res)=>{
  const {email} = req.body
  if(!email){
    throw new ApiError(400, 'Email is required');
  }
  try {
    const user = await authModel.findOne({email})
    if(!user){
      // return res.status(404).json({success:false, message:'user not found'})
      throw new ApiError(404, 'User not found');
    }
    const resetOtp = String(Math.floor(100000 + Math.random() * 900000))
   const resetOtpHash = await bcrypt.hash(resetOtp,12)
    user.resetPassword = resetOtpHash,
    user.resetPasswordExpiresAt = Date.now() + 10 * 60 * 1000
    await user.save()
    await sendNotification(email, 'OTP', {
      userName: user.name,
      otp: resetOtp
    });
    res.status(200).json({success:true, message:'Reset Password Send Successful..'})
  } catch (error) {
    //  console.log(error)
    logger.error('forgotPasswordOtp_error', {error, stack: error.stack});
    throw new ApiError(500, 'Internal server error');
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
      throw new ApiError(404, 'User not found');
    }

    const isMatch = await bcrypt.compare(otp, user.resetPassword);
    if (!isMatch) {
      logAuthEvent('password_reset_failed', user._id, user.farmId, req.ip, req.get('User-Agent'), { reason: 'invalid_otp' });
      throw new ApiError(400, 'Invalid OTP Code');
    }

    if (user.resetPasswordExpiresAt < Date.now()) {
      logAuthEvent('password_reset_failed', user._id, user.farmId, req.ip, req.get('User-Agent'), { reason: 'otp_expired' });
      throw new ApiError(400, 'Reset Password OTP Code Expired');
    }

    if (!user.resetPassword || user.resetPassword === '') {
      throw new ApiError(400, 'Please Request for Reset Password OTP Code');
    }

    const hashNewPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashNewPassword;
    user.resetPassword = '';
    user.resetPasswordExpiresAt = 0;
    await user.save();

    logAuthEvent('password_reset_success', user._id, user.farmId, req.ip, req.get('User-Agent'));

    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // console.log(error);
    logger.error('resetPassword_error', {error, stack: error.stack});
    logAuthEvent('password_reset_error', null, null, req.ip, req.get('User-Agent'), { error: error.message });
    throw new ApiError(500, 'Internal server error');
  }
};
