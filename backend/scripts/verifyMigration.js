const mongoose = require('mongoose');
require('dotenv').config();
const { resolveSrvMongoUri, buildFarmUri } = require('../utils/dbManager');

async function verifyMigration() {
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

        let successCount = 0;
        let totalFarms = 0;

        for (const manager of managers) {
            const farmId = manager.farmId;
            if (!farmId) continue;

            totalFarms++;
            console.log(`\nFarm: ${farmId} (${manager.name})`);

            // Build and resolve farm URI
            const farmUri = buildFarmUri(process.env.MONGO_URI, farmId);
            const resolvedFarmUri = await resolveSrvMongoUri(farmUri);
            const farmConn = mongoose.createConnection(resolvedFarmUri);
            if (farmConn.readyState !== 1) {
                await new Promise(resolve => farmConn.once('connected', resolve));
            }

            // Collections to check
            const collections = ['livestocks', 'poultrys', 'feeds', 'sells', 'expenses'];
            const modelNames = {
                'livestocks': 'liveStock',
                'poultrys': 'poultry',
                'feeds': 'feed',
                'sells': 'sells',
                'expenses': 'expenses'
            };

            console.log('┌────────────┬──────────┬─────────┬────────┐');
            console.log('│ Collection │ Old DB   │ New DB  │ Status │');
            console.log('├────────────┼──────────┼─────────┼────────┤');

            let farmOk = true;

            for (const coll of collections) {
                const modelName = modelNames[coll];
                const schema = require(`../models/${modelName}`).schema;
                const mainModel = mainConn.model(coll, schema);
                const farmModel = farmConn.model(coll, schema);

                const oldCount = await mainModel.countDocuments({ farmId: farmId });
                const newCount = await farmModel.countDocuments();

                const status = oldCount === newCount ? '✅ OK' : '❌ MISMATCH';
                if (oldCount !== newCount) farmOk = false;

                console.log(`│ ${coll.padEnd(10)} │ ${oldCount.toString().padEnd(8)} │ ${newCount.toString().padEnd(7)} │ ${status} │`);
            }

            console.log('└────────────┴──────────┴─────────┴────────┘');

            if (farmOk) successCount++;

            await farmConn.close();
        }

        await mainConn.close();
        console.log(`\n✅ Verification complete — ${successCount}/${totalFarms} farms verified successfully`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Verification error:', error);
        process.exit(1);
    }
}

verifyMigration();
