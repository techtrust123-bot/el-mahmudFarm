const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    farmId:{
        type:String,
        required:true
    },
    userId:{
        type:String,
        required:true
    },
    reference:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },
    plan:{
        type:String,
        enum: ['starter', 'basic', 'premium'],
        lowercase:true,
        trim:true
    },
    paymentType:{
        type:String,
        enum: ['new_subscription', 'upgrade'],
        default:'new_subscription',
        lowercase:true,
        trim:true
    },
    subscriptionType:{
        type:String,
        enum: ['none', 'subscription', 'one-time','paid'],
        lowercase:true,
        trim:true
    },
    subscriptionStart:{
        type:Date,
        default:null
    },
    subscriptionEnd:{
        type:Date,
        default:null
    },
    isSubscribed:{
        type:Boolean,
        default:true
    },
    billingCycle:{
        type:String,
        enum: ['monthly', 'yearly'],
        required:true,
        tolowercase:true,
        trim:true
    },
    amount:{
        type:Number,
        required:true
    },
    currency:{
        type:String,
        enum: ['NGN'],
        required:true,
        default: 'NGN',

    },
    status:{
        type:String,
        enum: ['pending', 'success', 'failed', 'abandoned','processing'],
        default: 'pending'
    },
    subscriptionStatus:{
        type:String,
        enum: ['pending', 'active', 'inactive'],
        default: 'pending'
    },
    paystackTransactionId:{
        type:String,
        default:null
    },
    paidAt:{
        type:Date,
        default:null
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    processedAt:{
        type:Date,
        default:null
    },
    paystackEventId: {
        type: String,
        default: null,
    }
},{timestamps:true});

paymentSchema.index({ farmId: 1 })
paymentSchema.index({ userId: 1 })

paymentSchema.index({
    farmId: 1,
    status: 1,
})
paymentSchema.index({ status: 1, processedAt: 1, reference: 1 })

const Payment = mongoose.model('Payment', paymentSchema)

module.exports = Payment;