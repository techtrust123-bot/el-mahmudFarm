const mongoose = require('mongoose');

const feedSchema = new mongoose.Schema({
    farmId:{
        type:String,
    },
    feedType:{
        type:String,
        required:true
    },
    animalType:{
        type:String,
        enum:['broiler','layer','cattle','cow','sheep','goat','horse','ram','bool'],
        required:true
    },
    poultryType:{
        type:String,
        trim:true,
    },
    feedCategory:{
        type:String,
        required:true,
        lowercase:true,
        trim:true,
    },
    totalDailyConsumption:{
        type:Number,
        default:0
    },
    poultryDailyConsumption:{
        type:Number,
        default:0,
        maxLength: 4
    },
    livestockDailyConsumption:{
        type:Number,
        default:0,
        maxLength: 4
    },
    totalPoultryFeedConsumedPerday:{
        type:Number,
        default:0
    },
    totalLivestockFeedConsumedPerday:{
        type:Number,
        default:0
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

feedSchema.index({ farmId: 1 });
feedSchema.index({ animalType: 1 });
feedSchema.index({ quantity: 1 });
// Ensure feedType is unique per farm, not globally
feedSchema.index({ farmId: 1, feedType: 1 }, { unique: true, sparse: true });


const Feed = mongoose.model('Feed',feedSchema)

module.exports = Feed