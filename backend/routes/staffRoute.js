const express = require('express');
const { addStaff, getStaff, updateStaff, deleteStaff, getStaffById } = require('../controllers/staffController');
const { authMiddleware, isManager } = require('../middleweres/authMiddlewere');
const { attachFarmDB } = require("../middleware/dbMiddleware");
const router = express.Router();

router.post('/add-staff', authMiddleware, attachFarmDB, isManager, addStaff)
router.get('/list', authMiddleware, attachFarmDB, isManager, getStaff)
router.put('/edit/:id', authMiddleware, attachFarmDB, isManager, updateStaff)
router.delete('/del/:id', authMiddleware, attachFarmDB, isManager, deleteStaff)
router.get('/:id', authMiddleware, attachFarmDB, isManager, getStaffById)

module.exports = router