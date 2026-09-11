const express = require('express');
const { addEgg } = require('../controllers/eggController');


const router = express.Router();

router.post('/add-egg', addEgg);

module.exports = router;
