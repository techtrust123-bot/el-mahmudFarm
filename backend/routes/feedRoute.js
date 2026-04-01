const { getFeed, getById, addFeed, edit, del } = require("../controllers/feedController")

const express = require('express')
const { authMiddleware } = require("../middleweres/authMiddlewere")
const router = express.Router()

router.post('/add-feed',authMiddleware,addFeed)
router.get('/feed',authMiddleware,getFeed)
router.put('/edit/:id',authMiddleware,edit)
router.get('/:id',authMiddleware,getById)
router.delete('/del-feed/:id',authMiddleware,del)

module.exports = router