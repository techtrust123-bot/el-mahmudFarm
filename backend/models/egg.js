const mongoose = require('mongoose');

const eggSchema = new mongoose.Schema({
    poultryType:{
        type:String,
        required:true
    },
    batchId:{
        type:String,
        required:true,
        unique:true
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
    salePricePerCrate:{
        type: Number,
        default:0
    },
    totalCrateSold:{
        type:Number,
        default:0
    },
    date:{
        type:Date,
        required:true
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
    },
    profitPerEgg:{
        type:Number,
        default:0
    },
    totalEggProfit:{
        type:Number,
        default:0
    },
    AvailableEggCrates:{
        type:Number,
        default:0
    }
},{timestamps:true})

const Egg = mongoose.model('Egg', eggSchema)

module.exports = Egg;