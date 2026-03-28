const authModel = require('../models/auth');
const jwt = require('jsonwebtoken')
const crypto = require('crypto');
const trasporter = require('../nodemailer/trasporter');
const bcrypt = require('bcryptjs')


exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if the user already exists
    const existingUser = await authModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const userCount = await authModel.countDocuments();
    const role = userCount === 0 ? 'admin' : 'staff'; // First user is admin, others are staff
    const hashPassword = await bcrypt.hash(password,10)
    const user = new authModel({ name, email, password:hashPassword, role });
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const otphash = await bcrypt.hash(otp,10)
    user.verificationOtp = otphash
    user.verificationOtpExpiresAt = Date.now() + 10 * 60 * 1000
    await user.save();
    const token = jwt.sign({id:user._id, role:user.role},process.env.JWT_SECRET,{expiresIn:'2hrs'})

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Set secure flag in production
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Adjust as needed (e.g., 'lax' or 'none')
      maxAge:2*60*60*1000 // 2 hours in milliseconds
    });

    const mailOption = {
      from:process.env.SENDER_MAIL,
      to:email,
      subject:"ACCOUNT VERIFICATION OTP",
      text:`Hello ${name}, your verification otpCode is: ${otp} please verified your account using this otpcode`
    }

    await trasporter.sendMail(mailOption)
    return res.status(201).json({ message: 'User registered successfully', token });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  const {email, password} =req.body
  if(!email || !password){
    return res.status(400).json({message:"Input Fields are required..."})
  }
  try {
    const user = await  authModel.findOne({email})
    if(!user){
      return res.status(404).json({message:"user not found"})
    }
    const isMatch = await bcrypt.compare(password,user.password)
    if(!isMatch){
      return res.status(400).json({message:"Invalid Creadentials"})
    }
    const token = jwt.sign({id:user._id,role:user.role},process.env.JWT_SECRET,{expiresIn:"1hrs"})
    res.cookie("token",token,{
      httpOnly:true,
      secure: process.env.NODE_ENV === "production",
      sameSite:process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 1 * 60 * 60 *1000
    })

    res.status(200).json({success: true, message:"Login Successful", user: { id: user._id, name: user.name, email: user.email, role: user.role }, token})
  } catch (error) {
    console.log(error)
    res.status(500).json({message:error.message})
  }
}

exports.logout = async(req,res)=>{
  try {
    res.clearCookie('token',{
      httpOnly:true,
      secure:process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? 'strict' : 'lax'
    })
    res.status(200).json({message:"Logout Successful"})
  } catch (error) {
    console.log(error)
    res.status(500).json({message:error.message})
  }
}


exports.verifiedOtp = async(req,res)=>{
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
    const users = await authModel.find().select('-password')
    if(!users){
      return res.status(404).json({message:'users not found'})
    }
    res.status(200).json({users})
  } catch (error) {
    console.log(error)
    res.status(500).json({message:error.message})
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
    const otphash = await bcrypt.hash(otp,10)
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
   const resetOtpHash = await bcrypt.hash(resetOtp,10)
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

exports.resetPassword = async(req,res)=>{
  const {email, otp, newPassword} = req.body
  if(!otp ||!newPassword || !email){
    return res.status(400).json({message: "Input Field are Required..."})
  }
  if(newPassword.length < 8){
    return res.status(400).json({message:"New Password must be at least 8 characters"})
  }
  try {
    const user = await authModel.findOne({email})
    if(!user){
      return res.status(404).json({message:'user not found'})
    }
    const isMatch = await bcrypt.compare(otp, user.resetPassword)
    if(!isMatch){
      return res.status(400).json({message:"Invalid Otp Code "})
    }
    if(user.resetPasswordExpiresAt < Date.now()){
      return res.status(400).json({message:"Reset Password Otp Code Expired"})
    }
    if(!user.resetPassword){
      return res.status(400).json({message:"Please Request for Reset Password Otp Code"})
    }
    if(user.resetPassword === ''){
      return res.status(400).json({message:"Please Request for Reset Password Otp Code"})
    }
  //    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
  // if (!passwordRegex.test(newPassword)) {
  //   return res.status(400).json({
  //     message: "Password must contain uppercase, lowercase, number, and special character"
  //   });
  // }
    
    const hashNewpassword = await bcrypt.hash(newPassword,10)
    user.password = hashNewpassword
    user.resetPassword = ''
    user.resetPasswordExpiresAt = 0
    await user.save()
    res.status(200).json({message:"password reset successful.."})
  } catch (error) {
     console.log(error)
    res.status(500).json({message:error.message})
  }
}
