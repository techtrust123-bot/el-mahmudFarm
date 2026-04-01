const express = require('express')
const { createExpense, getExpenses, editExpense, getExpenseById, removeExpense } = require('../controllers/expensesController')
const router = express.Router()

router.post('/add-expense',createExpense)
router.get('/list', getExpenses)
router.put('/edit/:id',editExpense)
router.delete('/delete/:id', removeExpense)
router.get('/:id', getExpenseById)

module.exports = router