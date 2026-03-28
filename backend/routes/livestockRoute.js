const express = require('express')
const { createLiveStock, getLivestocks, getLiveStockById, edit, remove } = require('../controllers/livestockController')
const router = express.Router()

router.post('/add-animal',createLiveStock)
router.get('/list', getLivestocks)
router.get('/:id', getLiveStockById)
router.put('/edit/:id',edit)
router.delete('/:id',remove)

module.exports = router