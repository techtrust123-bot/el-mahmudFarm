const express = require('express')
const { authMiddleware, checkPermission } = require('../middleweres/authMiddlewere')
const { attachFarmDB } = require("../middleware/dbMiddleware")
const { createPoultry, getPoultry, getPoultryById, editPoultry, removePoultry, poultryCount } = require('../controllers/poultryController')
const router = express.Router()

router.post('/add-poultry', authMiddleware, attachFarmDB, checkPermission('poultry'), createPoultry)
router.get('/list', authMiddleware, attachFarmDB, checkPermission('poultry'), getPoultry)
router.get('/count', authMiddleware, attachFarmDB, checkPermission('poultry'), poultryCount)
router.get('/:id', authMiddleware, attachFarmDB, checkPermission('poultry'), getPoultryById)
router.put('/edit/:id', authMiddleware, attachFarmDB, checkPermission('poultry'), editPoultry)
router.delete('/:id', authMiddleware, attachFarmDB, checkPermission('poultry'), removePoultry)

module.exports = router