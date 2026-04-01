const express = require('express');
const { addStaff, getStaff, updateStaff, deleteStaff, getStaffById } = require('../controllers/staffController');
const router = express.Router();

router.post('/add-staff', addStaff)
router.get('/list', getStaff)
router.put('/edit/:id', updateStaff)
router.delete('/del/:id', deleteStaff)
router.get('/:id',getStaffById)

module.exports = router