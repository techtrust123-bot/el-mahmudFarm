const mongoose = require('mongoose');
require('dotenv').config();

const {
  resolveSrvMongoUri,
  buildFarmUri,
} = require('../utils/dbManager');

const AuthModel = require('../models/auth');
const LiveStockModel = require('../models/liveStock');

const authSchema = AuthModel.schema;
const liveStockSchema = LiveStockModel.schema;

const DRY_RUN = false;

const calculateTotalFeedCost = (animal) => {
  const purchasePrice = Number(animal.purchasePrice);
  const totalCost = Number(animal.totalCost);

  if (!Number.isFinite(purchasePrice) || !Number.isFinite(totalCost)) {
    return {
      valid: false,
      reason: 'missing or invalid purchasePrice or totalCost',
    };
  }

  if (totalCost < purchasePrice) {
    return {
      valid: false,
      reason: 'suspicious: totalCost is less than purchasePrice',
    };
  }

  return {
    valid: true,
    totalFeedCost: totalCost - purchasePrice,
  };
};

const getCentralConnection = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is required.');
  }

  const connection = mongoose.createConnection(await resolveSrvMongoUri(process.env.MONGO_URI));
  await connection.asPromise();
  console.log('✅ Connected to central database.');
  return connection;
};

const getTenantFarmIds = async (mainConnection) => {
  const Auth = mainConnection.models.Auth || mainConnection.model('Auth', authSchema, 'auth');

  const tenantUsers = await Auth.find({
    farmId: { $exists: true, $ne: null, $ne: '' },
    userType: { $in: ['manager', 'admin'] },
  }).select('farmId userType name email').lean();

  const uniqueFarmIds = new Set();

  for (const user of tenantUsers) {
    const farmId = String(user.farmId || '').trim();

    if (!farmId) {
      continue;
    }

    uniqueFarmIds.add(farmId);
  }

  return Array.from(uniqueFarmIds).sort();
};

const migrateLivestockForFarm = async (farmConnection, farmId, dryRun = DRY_RUN) => {
  const LiveStock = farmConnection.models.LiveStock || farmConnection.model('LiveStock', liveStockSchema);

  const animals = await LiveStock.find({
    totalFeedCost: { $exists: false },
  }).lean();

  console.log(`Found ${animals.length} livestock record(s) requiring migration.`);

  let updatedCount = 0;
  let skippedCount = 0;
  let wouldUpdateCount = 0;

  for (const animal of animals) {
    const animalLabel = animal.tagNumber || animal.name || String(animal._id);
    const calc = calculateTotalFeedCost(animal);

    if (!calc.valid) {
      skippedCount += 1;
      console.log(`⚠️ ${animalLabel} → skipped: ${calc.reason}`);
      continue;
    }

    const totalFeedCost = calc.totalFeedCost;

    if (dryRun) {
      wouldUpdateCount += 1;
      console.log(`[DRY RUN] ${animalLabel} → totalFeedCost = ${totalFeedCost}`);
      continue;
    }

    const updateResult = await LiveStock.updateOne(
      {
        _id: animal._id,
        totalFeedCost: { $exists: false },
      },
      {
        $set: { totalFeedCost },
      }
    );

    if (updateResult.matchedCount > 0) {
      updatedCount += 1;
      console.log(`✅ ${animalLabel} → totalFeedCost = ${totalFeedCost}`);
    } else {
      skippedCount += 1;
      console.log(`⚠️ ${animalLabel} → skipped: record no longer qualifies for migration`);
    }
  }

  return {
    foundCount: animals.length,
    updatedCount,
    skippedCount,
    wouldUpdateCount,
  };
};

const runMigration = async () => {
  let mainConnection = null;
  const processedFarmIds = new Set();
  const failedFarmEntries = [];

  let farmsProcessed = 0;
  let successfulFarms = 0;
  let failedFarms = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalWouldUpdate = 0;

  try {
    mainConnection = await getCentralConnection();

    const farmIds = await getTenantFarmIds(mainConnection);

    console.log(`Found ${farmIds.length} farm(s) in the central database.`);

    for (const farmId of farmIds) {
      if (processedFarmIds.has(farmId)) {
        continue;
      }

      processedFarmIds.add(farmId);
      farmsProcessed += 1;

      let farmConnection = null;

      try {
        console.log(`\n========================================`);
        console.log(`Farm: ${farmId}`);
        console.log(`========================================`);

        const resolvedMainUri = await resolveSrvMongoUri(process.env.MONGO_URI);
        const farmUri = buildFarmUri(resolvedMainUri, farmId);

        farmConnection = mongoose.createConnection(farmUri);
        await farmConnection.asPromise();

        console.log(`✅ Connected to farm database for ${farmId}`);

        const result = await migrateLivestockForFarm(farmConnection, farmId, DRY_RUN);

        console.log(`Farm ${farmId} complete.`);
        console.log(`Updated: ${result.updatedCount}`);
        console.log(`Skipped: ${result.skippedCount}`);

        successfulFarms += 1;
        totalUpdated += result.updatedCount;
        totalSkipped += result.skippedCount;
        totalWouldUpdate += result.wouldUpdateCount;
      } catch (error) {
        failedFarms += 1;
        const errorMessage = error?.message || String(error);

        failedFarmEntries.push({ farmId, errorMessage });
        console.log(`❌ Farm ${farmId} failed: ${errorMessage}`);
      } finally {
        if (farmConnection) {
          try {
            await farmConnection.close();
          } catch (closeError) {
            console.log(`⚠️ Unable to close connection for ${farmId}: ${closeError?.message || String(closeError)}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Central database migration failed:', error?.message || error);
    throw error;
  } finally {
    if (mainConnection) {
      try {
        await mainConnection.close();
      } catch (closeError) {
        console.log(`⚠️ Unable to close central database connection: ${closeError?.message || String(closeError)}`);
      }
    }
  }

  console.log(`\n========================================`);
  console.log('MIGRATION COMPLETE');
  console.log('========================================');
  console.log(`Farms processed: ${farmsProcessed}`);
  console.log(`Successful farms: ${successfulFarms}`);
  console.log(`Failed farms: ${failedFarms}`);

  if (DRY_RUN) {
    console.log(`Livestock that would be updated: ${totalWouldUpdate}`);
  } else {
    console.log(`Livestock updated: ${totalUpdated}`);
  }

  console.log(`Livestock skipped: ${totalSkipped}`);

  if (failedFarmEntries.length > 0) {
    console.log('\nFailed farms:');
    for (const entry of failedFarmEntries) {
      console.log(`- ${entry.farmId}: ${entry.errorMessage}`);
    }
  }
};

if (require.main === module) {
  runMigration()
    .catch((error) => {
      console.error('Migration script crashed:', error?.message || error);
      process.exitCode = 1;
    });
}

module.exports = {
  DRY_RUN,
  calculateTotalFeedCost,
  migrateLivestockForFarm,
  runMigration,
};