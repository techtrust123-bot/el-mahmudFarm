const express = require('express')

const router = express.Router()

router.use('/auth', require('./authRoute'))
router.use('/payment', require('./paymentRoutes'))
router.use('/user', require('./userRoute'))
router.use('/livestock', require('./livestockRoute'))
router.use('/poultry', require('./poultryRoute'))
router.use('/feed', require('./feedRoute'))
router.use('/sell', require('./sellsRoute'))
router.use('/expense', require('./expenseRoute'))
router.use('/staff', require('./staffRoute'))

module.exports = router