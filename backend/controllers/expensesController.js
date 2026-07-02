// const Expenses = require("../models/expenses")
const { sendNotification } = require('../services/emailService')

exports.createExpense = async(req,res)=>{
    const { Expenses } = req.farmModels
    const {title,amount,date,category,description,descriptions} = req.body
    const expenseDescription = description ?? descriptions ?? ''
    if(!title || amount === undefined || amount === null || amount === '' || !date || !category){
        return res.status(400).json({success:false,message:"All input fields are required.."})
    }
    try {
        const expense = new Expenses({
            title,
            amount,
            date,
            category,
            descriptions: expenseDescription
        })
        await expense.save()

        const categoryExpenses = await Expenses.find({ category }).lean()
        const averageAmount = categoryExpenses.length > 0
            ? categoryExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0) / categoryExpenses.length
            : 0
        const isUnusualExpense = Number(amount) > 0 && averageAmount > 0 && Number(amount) > averageAmount * 2

        if (isUnusualExpense && req.user?.email) {
            await sendNotification(req.user.email, 'UNUSUAL_EXPENSE', {
                userName: req.user.name || 'User',
                category,
                amount: Number(amount),
                avgAmount: averageAmount
            })
        }

        res.status(201).json({success:true,message:"Expense created successfully..."})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:error.message || "error while creating expense"})
    }
}

exports.getExpenses = async(req,res)=>{
    const { Expenses } = req.farmModels
    try {
        const expenses = await Expenses.find()
        res.status(200).json({success:true,message:"Expenses found...",data:expenses})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:error.message || "error while fetching expenses"})
    }
}

exports.getExpenseById = async(req,res)=>{
    const { Expenses } = req.farmModels
    const id = req.params.id
    try {
        const expense = await Expenses.findOne({ _id: id })
        if(!expense){
            return res.status(404).json({success:false,message:"Expense not found..."})
        }
        res.status(200).json({success:true,message:"Expense found...",data:expense})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:error.message || "error while fetching expense"})
    }
}

exports.editExpense = async(req,res)=>{
    const { Expenses } = req.farmModels
    const id = req.params.id
    const {title,amount,date,category,description,descriptions} = req.body
    const expenseDescription = description ?? descriptions ?? ''
    try {
        const expense = await Expenses.findById(id)
        if(!expense){
            return res.status(404).json({success:false,message:"Expense not found..."})
        }
        const updateExpense = await Expenses.findOneAndUpdate(
            { _id: id },
            { title, amount, date, category, descriptions: expenseDescription },
            { returnDocument: 'after' }
        )
        res.status(200).json({success:true,message:"Expense updated successfully...",data:updateExpense})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:error.message || "error while updating expense"})
    }
}

exports.removeExpense = async(req,res)=>{
    const { Expenses } = req.farmModels
    const id = req.params.id
    try {
        const expense = await Expenses.findOne({ _id: id })
        if(!expense){
            return res.status(404).json({success:false,message:"Expense not found..."})
        }
        await Expenses.findOneAndDelete({ _id: id })
        res.status(200).json({success:true,message:"Expense deleted successfully..."})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:error.message || "error while deleting expense"})
    }

}