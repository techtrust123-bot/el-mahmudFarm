const express = require('express')
const { createLiveStock, getLivestocks, getLiveStockById, edit, remove } = require('../controllers/livestockController')
const { authMiddleware } = require('../middleweres/authMiddlewere')
const router = express.Router()

router.post('/add-animal',authMiddleware,createLiveStock)
router.get('/list', authMiddleware, getLivestocks)
router.get('/:id', authMiddleware, getLiveStockById)
router.put('/edit/:id', authMiddleware, edit)
router.delete('/:id', authMiddleware, remove)

module.exports = router