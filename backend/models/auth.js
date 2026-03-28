const mongoose = require('mongoose');
const authSechema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        trim: true,
    },
    role:{
        type:String,
        enum:['admin','staff','seller','manager',],
        default:'staff'
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
    }
},{timestamps: true});

const authModel = mongoose.model('auth', authSechema);
module.exports = authModel;