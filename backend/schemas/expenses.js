const mongoose = require('mongoose')

const expensesSchema = new mongoose.Schema({
    title:{
        type: String,
        required: true
    },
    amount:{
        type: Number,
        required: true
     },
    category:{
        type: String,
        required: true,
    },
    descriptions:{
        type: String,
        default:'',
        required: false
     },
    date:{
        type:Date,
        required: true
     },
    
},{timestamps:true})

module.exports = expensesSchema