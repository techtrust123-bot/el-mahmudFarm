const express = require('express')
const { createLiveStock, getLivestocks, getLiveStockById, edit, remove } = require('../controllers/livestockController')
const { authMiddleware, checkPermission } = require('../middleweres/authMiddlewere')
const { attachFarmDB } = require("../middleware/dbMiddleware")
const router = express.Router()

router.post('/add-animal', authMiddleware, attachFarmDB, checkPermission('livestock'), createLiveStock)
router.get('/list', authMiddleware, attachFarmDB, checkPermission('livestock'), getLivestocks)
router.get('/:id', authMiddleware, attachFarmDB, checkPermission('livestock'), getLiveStockById)
router.put('/edit/:id', authMiddleware, attachFarmDB, checkPermission('livestock'), edit)
router.delete('/:id', authMiddleware, attachFarmDB, checkPermission('livestock'), remove)

module.exports = router