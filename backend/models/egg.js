const mongoose = require('mongoose');

const eggSchema = new mongoose.Schema({
    poultryType:{
        type:String,
        required:true
    },
    avlDailyEgg:{
        type:Number,
        required:true
    },
    totalDailyEgg:{
        type:Number,
        required:true
    },
    salePrice:{
        type: Number,
        default:0
    },
    date:{
        type:Date,
        default:Date.now
    },
    damageEggs:{
        type: Number,
        default:0
    },
    costPricePerEgg:{
        type: Number,
        default:0
    },
    totalEggCost:{
        type:Number,
        default:0
    },
    cratePrice:{
        type:Number,
        default:0
    }
},{timestamps:true})

const Egg = mongoose.model('Egg', eggSchema)

module.exports = Egg;