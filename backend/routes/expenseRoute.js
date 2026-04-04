const express = require('express')
const { createExpense, getExpenses, editExpense, getExpenseById, removeExpense } = require('../controllers/expensesController')
const { authMiddleware, checkPermission } = require('../middleweres/authMiddlewere')
const { attachFarmDB } = require("../middleware/dbMiddleware")
const router = express.Router()

router.post('/add-expense', authMiddleware, attachFarmDB, checkPermission('expenses'), createExpense)
router.get('/list', authMiddleware, attachFarmDB, checkPermission('expenses'), getExpenses)
router.put('/edit/:id', authMiddleware, attachFarmDB, checkPermission('expenses'), editExpense)
router.delete('/delete/:id', authMiddleware, attachFarmDB, checkPermission('expenses'), removeExpense)
router.get('/:id', authMiddleware, attachFarmDB, checkPermission('expenses'), getExpenseById)

module.exports = router