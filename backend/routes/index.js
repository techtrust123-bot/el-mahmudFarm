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
// router.use('/staff', require('./staffRoute'))
router.use('/dashboard', require('./dashboardRoute'))
router.use('/export', require('./exportRoute'))
router.use('/backup', require('./backupRoute'))
router.use('/ai', require('./aiRoute'))
router.use('/egg', require('./eggRoute'))
router.use('/notifications', require('./notificationRoute'))
router.use('/support', require('./supportRoute'))

module.exports = router