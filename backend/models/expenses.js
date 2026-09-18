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
    farmId:{
        type:String,
        required:true
    },
    date:{
        type:Date,
        required: true
     },
    
},{timestamps:true})


const Expenses = mongoose.model('expense',expensesSchema)

module.exports = Expenses