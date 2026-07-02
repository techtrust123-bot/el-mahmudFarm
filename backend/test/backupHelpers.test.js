const assert = require('assert');
const { validateMongoUri, resolveMainDatabaseName, normalizeBackupOptions, formatBytes } = require('../services/backupHelpers');

(async () => {
  try {
    console.log('Running backup helper tests...');

    assert.strictEqual(validateMongoUri('mongodb://localhost:27017/cloudfarm_main'), 'mongodb://localhost:27017/cloudfarm_main');
    assert.strictEqual(validateMongoUri('mongodb+srv://user:pass@cluster0.mongodb.net/cloudfarm_main'), 'mongodb+srv://user:pass@cluster0.mongodb.net/cloudfarm_main');
    assert.strictEqual(validateMongoUri(''), 'mongodb://127.0.0.1:27017/cloudfarm_main');
    assert.strictEqual(validateMongoUri(undefined), 'mongodb://127.0.0.1:27017/cloudfarm_main');

    assert.strictEqual(resolveMainDatabaseName('mongodb://localhost:27017/cloudfarm_main'), 'cloudfarm_main');
    assert.strictEqual(resolveMainDatabaseName('mongodb://localhost:27017/'), 'cloudfarm_main');

    const mainOptions = normalizeBackupOptions(null, {});
    assert.strictEqual(mainOptions.targetType, 'main');

    const farmOptions = normalizeBackupOptions('65ab12', {});
    assert.strictEqual(farmOptions.targetType, 'farm');
    assert.strictEqual(farmOptions.farmId, '65ab12');

    const allFarmsOptions = normalizeBackupOptions({ includeAllFarms: true }, {});
    assert.strictEqual(allFarmsOptions.targetType, 'all-farms');

    assert.strictEqual(formatBytes(0), '0 Bytes');
    assert.strictEqual(formatBytes(1024), '1.00 KB');
    assert.strictEqual(formatBytes(1024 * 1024), '1.00 MB');

    console.log('✅ backupHelpers tests passed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ backupHelpers tests failed.');
    console.error(error);
    process.exit(1);
  }
})();