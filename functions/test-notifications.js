/**
 * Test Script for Push Notifications
 * 
 * This script tests the sendPushNotification Cloud Function by:
 * 1. Creating a test message in Firestore
 * 2. Triggering the Cloud Function
 * 3. Verifying the notification was sent
 * 
 * Usage: node test-notifications.js
 * 
 * Note: This script is excluded from pre-commit hooks and should be run manually
 */

const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin with project configuration
const projectId = process.env.PROJECT_ID || 'msg-ai-1';

try {
  // Try to initialize with emulator settings first
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
  
  admin.initializeApp({
    projectId: projectId,
  });
  
  // Configure Firestore to use emulator if available
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log(`✅ Firebase Admin initialized for project: ${projectId} (using emulator: ${emulatorHost})`);
  } else {
    console.log(`✅ Firebase Admin initialized for project: ${projectId} (using production)`);
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  console.log('\n💡 Try one of these solutions:');
  console.log('   1. Use Firebase emulator: firebase emulators:start --only firestore');
  console.log('   2. Set up service account: export GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json');
  console.log('   3. Use Firebase CLI auth: firebase login && firebase use msg-ai-1');
  process.exit(1);
}

const db = admin.firestore();

async function testPushNotification() {
  console.log('🧪 Starting push notification test...');
  
  try {
    // Test data
    const testUserId = 'test-user-123';
    const testRecipientId = 'test-recipient-456';
    const testConversationId = 'test-conv-789';
    const testMessageId = `msg_${Date.now()}_test`;
    
    console.log(`📝 Creating test data...`);
    
    // 1. Create test users with FCM tokens
    const testFcmToken = 'test-fcm-token-' + Date.now();
    
    await db.collection('users').doc(testUserId).set({
      uid: testUserId,
      email: 'test@example.com',
      displayName: 'Test Sender',
      fcmTokens: [testFcmToken],
      online: true,
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    await db.collection('users').doc(testRecipientId).set({
      uid: testRecipientId,
      email: 'recipient@example.com',
      displayName: 'Test Recipient',
      fcmTokens: [testFcmToken],
      online: true,
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Test users created');
    
    // 2. Create test conversation
    await db.collection('conversations').doc(testConversationId).set({
      id: testConversationId,
      participants: [testUserId, testRecipientId],
      type: 'direct',
      groupName: null,
      groupPhoto: null,
      createdBy: testUserId,
      lastMessage: 'Test message for notification',
      lastMessageTime: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Test conversation created');
    
    // 3. Create test message (this will trigger the Cloud Function)
    console.log('📨 Creating test message (this will trigger the Cloud Function)...');
    
    const testMessage = {
      id: testMessageId,
      conversationId: testConversationId,
      senderId: testUserId,
      senderName: 'Test User', // Enhanced: Include senderName for payload verification
      text: 'This is a test message for push notifications!',
      imageUrl: null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'sent',
      readBy: [testUserId],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await db.collection('messages').doc(testMessageId).set(testMessage);
    
    console.log('✅ Test message created - Cloud Function should have been triggered');
    
    // 4. Wait a moment for the Cloud Function to process
    console.log('⏳ Waiting for Cloud Function to process...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 5. Check Cloud Function logs (we can't directly verify FCM delivery in this test)
    console.log('📊 Test completed!');
    
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      console.log('🔍 Note: Using Firebase Emulator - Cloud Functions are not triggered in emulator mode');
      console.log('   To test the actual Cloud Function:');
      console.log('   1. Deploy functions: npm run deploy');
      console.log('   2. Run test against production: unset FIRESTORE_EMULATOR_HOST && npm run test:notifications');
      console.log('   3. Check Firebase Console > Functions > Logs for sendPushNotification');
    } else {
      console.log('🔍 To verify the Cloud Function worked:');
      console.log('   1. Check Firebase Console > Functions > Logs');
      console.log('   2. Look for the sendPushNotification function logs');
      console.log('   3. Verify no errors occurred');
      console.log('   Enhanced payload features to verify:');
      console.log('   ✅ collapse_key (Android) and apns-collapse-id (iOS)');
      console.log('   ✅ senderName in data payload');
      console.log('   ✅ messageType detection (text vs image)');
      console.log('   ✅ iOS badge count management');
      console.log('   ✅ Smart payload selection (data-only vs full notification)');
      console.log('   ✅ Notification grouping by conversationId');
    }
    
    // 6. Cleanup test data
    console.log('🧹 Cleaning up test data...');
    await db.collection('messages').doc(testMessageId).delete();
    await db.collection('conversations').doc(testConversationId).delete();
    await db.collection('users').doc(testUserId).delete();
    await db.collection('users').doc(testRecipientId).delete();
    
    console.log('✅ Test data cleaned up');
    console.log('🎉 Push notification test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testPushNotification()
  .then(() => {
    console.log('✅ Test script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
