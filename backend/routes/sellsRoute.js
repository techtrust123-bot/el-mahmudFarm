const express = require('express');
const {getSells, getById, edit, remove, recordSales } = require('../controllers/sellsController');
const router = express.Router();

router.post('/add', recordSales)
router.get('/list',getSells)
router.put('/edit/:id',edit)
router.get('/:id',getById)
router.delete('/del/:id',remove)
module.exports = router