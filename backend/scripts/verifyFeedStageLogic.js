const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Feed = require('../models/feed');
const Poultry = require('../models/poultry');
const LiveStock = require('../models/liveStock');
const { recalculatePoultry, recalculateLivestock } = require('../controllers/feedController');

const cleanupQuery = { feedType: /^TEST_FEED_/ };
const poultryQuery = { batchId: /^TEST_P_/ };
const livestockQuery = { tagNumber: /^TEST_LS_/ };

const createTestRecords = async () => {
  const now = new Date();
  const starterBirth = new Date(now);
  starterBirth.setDate(starterBirth.getDate() - 14);
  const growerBirth = new Date(now);
  growerBirth.setDate(growerBirth.getDate() - 42);
  const cowStarterBirth = new Date(now);
  cowStarterBirth.setDate(cowStarterBirth.getDate() - 60);
  const cowGrowerBirth = new Date(now);
  cowGrowerBirth.setDate(cowGrowerBirth.getDate() - 150);

  const poultryStarter = new Poultry({
    batchId: 'TEST_P_STARTER',
    type: 'broiler',
    quantity: 30,
    purchaseDate: starterBirth.toISOString(),
    joinDate: starterBirth,
    birthDay: starterBirth,
    vaccinationStatus: 'done',
    purchasePrice: 100,
    status: 'available',
  });

  const poultryGrower = new Poultry({
    batchId: 'TEST_P_GROWER',
    type: 'broiler',
    quantity: 20,
    purchaseDate: growerBirth.toISOString(),
    joinDate: growerBirth,
    birthDay: growerBirth,
    vaccinationStatus: 'done',
    purchasePrice: 100,
    status: 'available',
  });

  const livestockStarter = new LiveStock({
    tagNumber: 'TEST_LS_STARTER',
    type: 'cow',
    breed: 'TestBreed',
    quantity: 2,
    purchaseDate: cowStarterBirth.toISOString(),
    joinDate: cowStarterBirth,
    birthDay: cowStarterBirth,
    age: 60,
    weight: 220,
    healthStatus: 'good',
    purchasePrice: 500,
    status: 'available',
  });

  const livestockGrower = new LiveStock({
    tagNumber: 'TEST_LS_GROWER',
    type: 'cow',
    breed: 'TestBreed',
    quantity: 3,
    purchaseDate: cowGrowerBirth.toISOString(),
    joinDate: cowGrowerBirth,
    birthDay: cowGrowerBirth,
    age: 150,
    weight: 320,
    healthStatus: 'good',
    purchasePrice: 700,
    status: 'available',
  });

  const feedStarter = new Feed({
    feedType: 'TEST_FEED_broiler starter',
    animalType: 'broiler',
    poultryType: 'broiler',
    feedCategory: 'Starter',
    quantity: 100,
    cost: 200,
    purchaseDate: now,
    supplier: 'test',
    feedName: 'Test Broiler Starter',
    totalPoultryFeedConsumedPerday: 60,
    lastConsumptionUpdate: now,
  });

  const feedGrower = new Feed({
    feedType: 'TEST_FEED_broiler grower',
    animalType: 'broiler',
    poultryType: 'broiler',
    feedCategory: 'Grower',
    quantity: 100,
    cost: 200,
    purchaseDate: now,
    supplier: 'test',
    feedName: 'Test Broiler Grower',
    totalPoultryFeedConsumedPerday: 90,
    lastConsumptionUpdate: now,
  });

  const cowStarterFeed = new Feed({
    feedType: 'TEST_FEED_cow starter',
    animalType: 'cow',
    feedCategory: 'Starter',
    quantity: 100,
    cost: 200,
    purchaseDate: now,
    supplier: 'test',
    feedName: 'Test Cow Starter',
    totalLivestockFeedConsumedPerday: 30,
    lastConsumptionUpdate: now,
  });

  const cowGrowerFeed = new Feed({
    feedType: 'TEST_FEED_cow grower',
    animalType: 'cow',
    feedCategory: 'Grower',
    quantity: 100,
    cost: 200,
    purchaseDate: now,
    supplier: 'test',
    feedName: 'Test Cow Grower',
    totalLivestockFeedConsumedPerday: 45,
    lastConsumptionUpdate: now,
  });

  await Promise.all([
    poultryStarter.save(),
    poultryGrower.save(),
    livestockStarter.save(),
    livestockGrower.save(),
    feedStarter.save(),
    feedGrower.save(),
    cowStarterFeed.save(),
    cowGrowerFeed.save(),
  ]);

  return { feedStarter, feedGrower, cowStarterFeed, cowGrowerFeed };
};

async function cleanup() {
  await Promise.all([
    Feed.deleteMany(cleanupQuery),
    Poultry.deleteMany(poultryQuery),
    LiveStock.deleteMany(livestockQuery),
  ]);
}

async function run() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI environment variable is required.');
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    await cleanup();

    const { feedStarter, feedGrower, cowStarterFeed, cowGrowerFeed } = await createTestRecords();

    await recalculatePoultry(feedStarter, { Feed, Poultry, LiveStock });
    await recalculatePoultry(feedGrower, { Feed, Poultry, LiveStock });
    await recalculateLivestock(cowStarterFeed, { Feed, Poultry, LiveStock });
    await recalculateLivestock(cowGrowerFeed, { Feed, Poultry, LiveStock });

    const updatedStarter = await Feed.findById(feedStarter._id);
    const updatedGrower = await Feed.findById(feedGrower._id);
    const updatedCowStarter = await Feed.findById(cowStarterFeed._id);
    const updatedCowGrower = await Feed.findById(cowGrowerFeed._id);

    console.log('\n--- Feed verification results ---');
    console.log(`Broiler Starter feed rate: ${updatedStarter.poultryDailyConsumption}  (expected 60 / 30 = 2)`);
    console.log(`Broiler Grower feed rate: ${updatedGrower.poultryDailyConsumption}  (expected 90 / 20 = 4.5)`);
    console.log(`Cow Starter feed rate: ${updatedCowStarter.livestockDailyConsumption}  (expected 30 / 2 = 15)`);
    console.log(`Cow Grower feed rate: ${updatedCowGrower.livestockDailyConsumption}  (expected 45 / 3 = 15)`);

    const poultryRecords = await Poultry.find(poultryQuery);
    console.log('\n--- Poultry assignment ---');
    poultryRecords.forEach((record) => {
      console.log(`  ${record.batchId}: feedStage=${record.feedStage} currentFeedType=${record.currentFeedType}`);
    });

    const livestockRecords = await LiveStock.find(livestockQuery);
    console.log('\n--- Livestock assignment ---');
    livestockRecords.forEach((record) => {
      console.log(`  ${record.tagNumber}: feedStage=${record.feedStage} currentFeedType=${record.currentFeedType || 'unassigned'}`);
    });

    console.log('\nCleaning up test records...');
    await cleanup();
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();