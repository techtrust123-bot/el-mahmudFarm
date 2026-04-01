const mongoose = require('mongoose');

const feedSchema = new mongoose.Schema({
    feedType:{
        type:String,
        required:true,
        unique:true
    },
    animalType:{
        type:String,
        enum:['broiler','layer','cattle','cow','sheep','goat','horse','ram','bool'],
    },
    poultryType:{
        type:String,
        trim:true,
    },
    feedCategory:{
        type:String,
        trim:true,
    },
    quantity:{
        type:Number,
        required:true
    },
    cost:{
        type:Number,
        required:true
    },
    purchaseDate:{
        type:Date,
        required:true
    },
    supplier:{
        type:String,
        required:true
    },
    consumption:{
        type:Number,
        default:0
    },
    averageDailyConsumption:{
        type:Number,
        default:0
    },
    lastConsumptionUpdate:{
        type:Date,
        default:Date.now
    },
    feedPricePerkg:{
        type:Number
    },
    feedName:{
        type:String,
        required:true
     },
     poultryFeedConsumedPerkg:{
        type:Number,
     },
     livestockFeedConsumedPerkg:{
        type:Number
     }
},{timestamps:true})


const Feed = mongoose.model('Feed',feedSchema)

module.exports = Feed