const express = require('express');
const {getSells, getById, edit, remove, recordSales } = require('../controllers/sellsController');
const { authMiddleware } = require('../middleweres/authMiddlewere');
const router = express.Router();

router.post('/add',authMiddleware, recordSales)
router.get('/list',authMiddleware,getSells)
router.put('/edit/:id',authMiddleware,edit)
router.get('/:id',authMiddleware,getById)
router.delete('/del/:id',authMiddleware,remove)
module.exports = router