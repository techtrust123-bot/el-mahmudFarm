const mongoose = require('mongoose')

const farmSettingsSchema = new mongoose.Schema({
    farmName:{
        type:String,
        required:true,
        trim:true
    },
    owner:{
        type:String,
        required:true,
        trim:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    phone:{
        type:Number,
        required:true,
    },
    address:{
        type:String,
        required:true,
    },
    city:{
        type:String,
        required:true,
    },
    country:{
        type:String,
        required:true,
    },
    postalCode:{
        type:String,
        required:true,
    },
    description:{
        type:String,
    },
},{timestamps:true})

// const profileSettingsSchema = new mongoose.Schema({
//     fullNam
// })

const FarmSettings = mongoose.model('farmSetting',farmSettingsSchema)
module.exports = FarmSettings