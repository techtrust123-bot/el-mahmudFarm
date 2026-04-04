const { getFeed, getById, addFeed, edit, del } = require("../controllers/feedController")

const express = require('express')
const { authMiddleware, checkPermission } = require("../middleweres/authMiddlewere")
const { attachFarmDB } = require("../middleware/dbMiddleware")
const router = express.Router()

router.post('/add-feed', authMiddleware, attachFarmDB, checkPermission('feed'), addFeed)
router.get('/feed', authMiddleware, attachFarmDB, checkPermission('feed'), getFeed)
router.put('/edit/:id', authMiddleware, attachFarmDB, checkPermission('feed'), edit)
router.get('/:id', authMiddleware, attachFarmDB, checkPermission('feed'), getById)
router.delete('/del-feed/:id', authMiddleware, attachFarmDB, checkPermission('feed'), del)

module.exports = router