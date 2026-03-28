const mongoose = require('mongoose');
const liveStockSchema = new mongoose.Schema({
    type:{
        type:String,
        enum:['cattle','cow','sheep','goat','house','ram','bool'],
        required:true
    },
    tagNumber:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },
    breed:{
        type:String,
        required:true
    },
    age:{
        type: Number,
        required:true
    },
    weight:{
        type: Number,
        required:true
    },
    purchaseDate:{
        type:String,
        required:true
    },
    healthStatus:{
        type:String,
        required:true
    },
    status:{
        type:String,
        required:true,
        enum:['available','sold'],
        default:'available'
    },
    costPrice:{
        type:Number
    },
    livestockFeedConsumed:{
        type:Number
    },
    totalCost:{
        type:Number
    },
    purchasePrice:{
        type:Number,
        required:true
    },
    quantity:{
        type:Number,
        default: 1
    },
   
},{timestamps:true})


const LiveStock = mongoose.model('LiveStock', liveStockSchema);
module.exports = LiveStock;