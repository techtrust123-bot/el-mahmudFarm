const express = require('express')
const { createExpense, getExpenses, editExpense, getExpenseById, removeExpense } = require('../controllers/expensesController')
const { authMiddleware, checkPermission } = require('../middleweres/authMiddlewere')
const { checkSubscription } = require('../middleware/subscriptionMiddleware')
const { attachFarmDB } = require("../middleware/dbMiddleware")
const { validate } = require('../middleweres/validation')
const { expenseValidation } = require('../middleweres/controllerValidation')
const { asyncHandler } = require('../middleware/errorHandler')
const router = express.Router()

router.post('/add-expense', authMiddleware, checkSubscription, attachFarmDB, checkPermission('expenses'), validate(expenseValidation), asyncHandler(createExpense))
router.get('/list', authMiddleware, checkSubscription, attachFarmDB, checkPermission('expenses'), asyncHandler(getExpenses))
router.put('/edit/:id', authMiddleware, checkSubscription, attachFarmDB, checkPermission('expenses'), validate(expenseValidation), asyncHandler(editExpense))
router.delete('/delete/:id', authMiddleware, checkSubscription, attachFarmDB, checkPermission('expenses'), asyncHandler(removeExpense))
router.get('/:id', authMiddleware, checkSubscription, attachFarmDB, checkPermission('expenses'), asyncHandler(getExpenseById))

module.exports = router