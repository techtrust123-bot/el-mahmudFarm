const express = require('express')
const { authMiddleware } = require('../middleweres/authMiddlewere')
const { createPoultry, getPoultry, getPoultryById, editPoultry, removePoultry, poultryCount } = require('../controllers/poultryController')
const router = express.Router()

router.post('/add-poultry',authMiddleware,createPoultry)
router.get('/list', authMiddleware,getPoultry)
router.get('/count', authMiddleware, poultryCount)
router.get('/:id', authMiddleware, getPoultryById)
router.put('/edit/:id',authMiddleware,editPoultry)
router.delete('/:id', authMiddleware,removePoultry)

module.exports = router