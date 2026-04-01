const mongoose = require('mongoose');
const staffSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true   
    },
    role:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    contact:{
        type:Number,
        required:true,
    },
    salary:{
        type:Number,
        required:true
    },
    hireDate:{
        type:Date,
        required:true
    },
},{timestamps:true})

const Staff = mongoose.model('staff',staffSchema)

module.exports = Staff