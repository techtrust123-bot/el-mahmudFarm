const { getFeed, getById, addFeed, edit, del } = require("../controllers/feedController")

const express = require('express')
const router = express.Router()

router.post('/add-feed',addFeed)
router.get('/feed',getFeed)
router.put('/edit/:id',edit)
router.get('/:id',getById)
router.delete('/del-feed/:id',del)

module.exports = router