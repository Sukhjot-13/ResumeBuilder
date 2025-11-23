
const mongoose = require('mongoose');
const { ROLES } = require('./src/lib/constants');


// Mock User model since we can't easily import the app one in a standalone script without babel/next
const UserSchema = new mongoose.Schema({
  email: String,
  role: Number,
  creditsUsed: Number,
  lastCreditResetDate: Date,
  subscriptionStatus: String,
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function checkAndResetDailyLimits(user) {
    if (!user) return;

    if (user.role === 99) { // SUBSCRIBER
      console.log('User is SUBSCRIBER, skipping daily reset.');
      return;
    }

    const now = new Date();
    const lastReset = user.lastCreditResetDate ? new Date(user.lastCreditResetDate) : new Date(0);
    
    const isDifferentDay = 
      now.getDate() !== lastReset.getDate() ||
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear();

    if (isDifferentDay) {
      console.log(`🔄 Resetting daily credits for user ${user._id}`);
      user.creditsUsed = 0;
      user.lastCreditResetDate = now;
      await user.save();
    } else {
        console.log('Same day, no reset needed.');
    }
}

async function runVerification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Test Free User Reset
    console.log('\n--- Testing Free User Reset ---');
    const freeUser = new User({
        email: `test_free_${Date.now()}@example.com`,
        role: 100,
        creditsUsed: 5,
        lastCreditResetDate: new Date(Date.now() - 86400000 * 2) // 2 days ago
    });
    await freeUser.save();
    console.log(`Created Free User: Credits=${freeUser.creditsUsed}, LastReset=${freeUser.lastCreditResetDate}`);

    await checkAndResetDailyLimits(freeUser);
    
    const updatedFreeUser = await User.findById(freeUser._id);
    console.log(`Updated Free User: Credits=${updatedFreeUser.creditsUsed}, LastReset=${updatedFreeUser.lastCreditResetDate}`);
    
    if (updatedFreeUser.creditsUsed === 0 && updatedFreeUser.lastCreditResetDate > freeUser.lastCreditResetDate) {
        console.log('✅ Free User Reset: PASSED');
    } else {
        console.error('❌ Free User Reset: FAILED');
    }

    // 2. Test Pro User No Reset
    console.log('\n--- Testing Pro User No Reset ---');
    const proUser = new User({
        email: `test_pro_${Date.now()}@example.com`,
        role: 99,
        creditsUsed: 10,
        lastCreditResetDate: new Date(Date.now() - 86400000 * 2) // 2 days ago
    });
    await proUser.save();
    console.log(`Created Pro User: Credits=${proUser.creditsUsed}, LastReset=${proUser.lastCreditResetDate}`);

    await checkAndResetDailyLimits(proUser);

    const updatedProUser = await User.findById(proUser._id);
    console.log(`Updated Pro User: Credits=${updatedProUser.creditsUsed}, LastReset=${updatedProUser.lastCreditResetDate}`);

    if (updatedProUser.creditsUsed === 10) {
        console.log('✅ Pro User No Reset: PASSED');
    } else {
        console.error('❌ Pro User No Reset: FAILED');
    }

    // Cleanup
    await User.deleteMany({ email: { $in: [freeUser.email, proUser.email] } });

  } catch (error) {
    console.error('Verification Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();
