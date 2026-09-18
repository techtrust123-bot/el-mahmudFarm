const mongoose = require('mongoose');

const authSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        trim: true,
    },
    farmName:{
        type:String,
        default:''
    },
    phone:{
        type:Number,
        default:0
    },
    address:{
        type:String,
        default:''
    },
    country:{
        type:String,
        default:''
    },
    city:{
        type:String,
        default:''
    },
    postalCode:{
        type:String,
        default:''
    },
    role:{
        type:String,
        trim:true,
        default:'manager'
    },
    userType:{
        type:String,
        enum:['manager','staff','admin'],
        default:'manager'
    },
    farmId:{
        type:String,
    },
    permissions:{
        type:[String],
        default: []
    },
    subscriptionStatus:{
        type:String,
        enum:['inactive','active','trial','expired','cancelled'],
        default:'inactive'
    },
    subscriptionType: {
        type: String,
        enum: ['none','trial','paid'],
        default: 'none'
    },
    subscriptionStart:{
        type:Date,
        default:null
    },
    subscriptionEnd:{
        type:Date,
        default:null
    },
    paystackCustomerCode:{
        type:String,
        default:null
    },
    lastPaymentReference:{
        type:String,
        default:null
    },
    isSubscribed:{
        type:Boolean,
        default:false
    },
    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'auth',
        default: null
    },
    salary:{
        type:Number,
        default:0
    },
    contact:{
        type:String,
        default:''
    },
    hireDate:{
        type:Date,
        default:null
    },
    balance:{
        type:Number,
        default:0
    },
    isAccountVerified:{
        type:String,
        default:false
    },
    verificationOtp:{
        type:String,
        default:''
    },
    verificationOtpExpiresAt:{
        type:Number,
        default:0
    },
    resetPassword:{
        type:String,
        default:''
    },
    resetPasswordExpiresAt:{
        type:Number,
        default:0
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    subscriptionPlan: {
        type: String,
        enum: ['starter', 'basic', 'premium', 'none','free'],
        default: null,
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly', 'none'],
        default: null,
    },
},{timestamps: true});

const authModel = mongoose.model('auth', authSchema);
module.exports = authModel;