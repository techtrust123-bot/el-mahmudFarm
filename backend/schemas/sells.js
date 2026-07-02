const mongoose = require('mongoose');

const sellSchema = new mongoose.Schema({
    batchId:{
        type:String,
        trim:true
    },
    date:{
        type:String,
        default:Date.now(),
        required:true
    },
    animalType:{
        type:String,
        required:true
    },
    quantitySold:{
        type:Number,
    },
    pricePerUnit:{
        type:Number,
        required:true
    },
    costPrice:{
        type:Number,
    },
    totalAmount:{
        type:Number,
    },
    profit:{
        type:Number,
    },
    customerName:{
        type:String,
        required:true
    },
    buyerContact:{
        type:Number
    },
    status:{
        type:String,
        required:true
    },
    tagNumber:{
        type:String,
    },
    invoiceId:{
        type:String,
        unique:true,
        default:''
    },
    invoiceGroupId: {
        type: String,
        index: true,
    }
},{timestamps:true})

module.exports = sellSchema;