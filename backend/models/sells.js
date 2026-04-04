const mongoose = require('mongoose')

const sellSchema = new  mongoose.Schema({
    farmId:{
        type:String,
        required:true
    },
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
    }
},{timestamps:true})

const Sells = mongoose.model('sell',sellSchema)

module.exports = Sells