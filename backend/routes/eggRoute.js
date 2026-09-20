const express = require('express');
const { addEgg,getEggs,getEggById,editEgg,deleteEgg } = require('../controllers/eggController');
const { authMiddleware, checkPermission } = require('../middleweres/authMiddlewere');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');
const { requireFeatureAccess } = require('../middleware/featureAuthorization');
const { attachFarmDB } = require('../middleware/dbMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');


const router = express.Router();

router.post(
	'/add-egg',
	authMiddleware,
	checkSubscription,
	requireFeatureAccess('eggInventory'),
	attachFarmDB,
	checkPermission('eggInventory'),
	asyncHandler(addEgg)
);
router.get(
	'/get-eggs',
	authMiddleware,
	checkSubscription,
	requireFeatureAccess('eggInventory'),
	attachFarmDB,
	checkPermission('eggInventory'),
	asyncHandler(getEggs)
);

router.get(
	'/get-eggs/:id',
	authMiddleware,
	checkSubscription,
	requireFeatureAccess('eggInventory'),
	attachFarmDB,
	checkPermission('eggInventory'),
	asyncHandler(getEggById)
);
router.put(
	'/edit-egg/:id',
	authMiddleware,
	checkSubscription,
	requireFeatureAccess('eggInventory'),
	attachFarmDB,
	checkPermission('eggInventory'),
	asyncHandler(editEgg)
);
router.delete(
	'/delete-egg/:id',
	authMiddleware,
	checkSubscription,
	requireFeatureAccess('eggInventory'),
	attachFarmDB,
	checkPermission('eggInventory'),
	asyncHandler(deleteEgg)
);


module.exports = router;
