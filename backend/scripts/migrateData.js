const mongoose = require('mongoose');
require('dotenv').config();
const { resolveSrvMongoUri, buildFarmUri } = require('../utils/dbManager');

async function migrateData() {
    try {
        // Connect to main DB
        const mainUri = await resolveSrvMongoUri(process.env.MONGO_URI);
        const mainConn = mongoose.createConnection(mainUri);
        if (mainConn.readyState !== 1) {
            await new Promise(resolve => mainConn.once('connected', resolve));
        }
        console.log('✅ Connected to main database (cloudfarm_main)');

        // Get all managers
        const User = mainConn.model('auth', require('../models/auth').schema);
        const managers = await User.find({ userType: 'manager' });
        console.log(`Found ${managers.length} manager(s) to migrate`);

        let successCount = 0;

        for (const manager of managers) {
            const farmId = manager.farmId;
            if (!farmId) {
                console.log(`⚠️  Skipping manager ${manager.name} - no farmId`);
                continue;
            }

            console.log(`\n── Migrating Farm: ${farmId} (${manager.name}) ──`);

            // Build and resolve farm URI
            const farmUri = buildFarmUri(process.env.MONGO_URI, farmId);
            const resolvedFarmUri = await resolveSrvMongoUri(farmUri);
            const farmConn = mongoose.createConnection(resolvedFarmUri);
            if (farmConn.readyState !== 1) {
                await new Promise(resolve => farmConn.once('connected', resolve));
            }
            console.log(`✅ Connected to farm_${farmId}`);

            // Migrate collections
            const collections = ['livestocks', 'poultrys', 'feeds', 'sells', 'expenses'];
            const modelNames = {
                'livestocks': 'liveStock',
                'poultrys': 'poultry',
                'feeds': 'feed',
                'sells': 'sells',
                'expenses': 'expenses'
            };

            for (const coll of collections) {
                const modelName = modelNames[coll];
                const schema = require(`../models/${modelName}`).schema;
                const mainModel = mainConn.model(coll, schema);
                const farmModel = farmConn.model(coll, schema);

                const oldDocs = await mainModel.find({ farmId: farmId });
                if (oldDocs.length > 0) {
                    const cleanDocs = oldDocs.map(doc => {
                        const obj = doc.toObject();
                        delete obj.farmId;
                        return obj;
                    });
                    await farmModel.insertMany(cleanDocs, { ordered: false });
                    console.log(`  ${coll}  → migrated ${oldDocs.length} documents`);
                } else {
                    console.log(`  ${coll}  → no documents to migrate`);
                }
            }

            await farmConn.close();
            console.log(`✅ Farm ${farmId} complete`);
            successCount++;
        }

        await mainConn.close();
        console.log(`\n✅ Migration complete — ${successCount}/${managers.length} farms migrated successfully`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

migrateData();
