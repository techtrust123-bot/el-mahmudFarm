const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config();
const { resolveSrvMongoUri, buildFarmUri } = require('../utils/dbManager');

async function rollbackMigration() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Are you sure you want to rollback the migration? This will DROP all farm databases. (yes/no): ', async (answer) => {
        if (answer.toLowerCase() !== 'yes') {
            console.log('Rollback cancelled.');
            rl.close();
            process.exit(0);
        }

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

            let droppedCount = 0;

            for (const manager of managers) {
                const farmId = manager.farmId;
                if (!farmId) continue;

                const farmDbName = `farm_${farmId}`;

                // Build and resolve farm URI
                const farmUri = buildFarmUri(process.env.MONGO_URI, farmId);
                const resolvedFarmUri = await resolveSrvMongoUri(farmUri);
                const farmConn = mongoose.createConnection(resolvedFarmUri);
                if (farmConn.readyState !== 1) {
                    await new Promise(resolve => farmConn.once('connected', resolve));
                }

                // Drop the database
                await farmConn.db.dropDatabase();
                console.log(`✅ Dropped database: ${farmDbName}`);

                await farmConn.close();
                droppedCount++;
            }

            await mainConn.close();
            console.log(`\n✅ Rollback complete — ${droppedCount} farm databases dropped`);
            rl.close();
            process.exit(0);
        } catch (error) {
            console.error('❌ Rollback error:', error);
            rl.close();
            process.exit(1);
        }
    });
}

rollbackMigration();
