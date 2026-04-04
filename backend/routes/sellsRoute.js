const express = require('express');
const {getSells, getById, edit, remove, recordSales } = require('../controllers/sellsController');
const { authMiddleware, checkPermission } = require('../middleweres/authMiddlewere');
const { attachFarmDB } = require("../middleware/dbMiddleware");
const router = express.Router();

router.post('/add', authMiddleware, attachFarmDB, checkPermission('sales'), recordSales)
router.get('/list', authMiddleware, attachFarmDB, checkPermission('sales'), getSells)
router.put('/edit/:id', authMiddleware, attachFarmDB, checkPermission('sales'), edit)
router.get('/:id', authMiddleware, attachFarmDB, checkPermission('sales'), getById)
router.delete('/del/:id', authMiddleware, attachFarmDB, checkPermission('sales'), remove)
module.exports = router