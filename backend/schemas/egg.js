const mongoose = require('mongoose')

const eggSchema = new mongoose.Schema({
    poultryType:{
        type:String,
        required:true,
    },
    avlDailyEgg:{
        type:Number,
        required:true,
        default:0
    },
    totalDailyEgg:{
        type:Number,
        required: true
    },
    salePrice:{
        type:Number,
    },
    date:{
        type:Date,
        default:Date.now
    },
    damageEggs:{
        type:Number,
        default:0
    },
    costPricePerEgg:{
        type: Number,
        default:0
    },
    totalCost:{
        type:Number,
        default:0
    },
    cratePrice:{
        type:Number,
        default:0
    },
    totalEggCost:{
        type:Number,
        default:0
    }
},{timestamps: true})

eggSchema.index({type:1});
eggSchema.index({status:1});

module.exports = eggSchema;