// testEmail.js - Script untuk test email service
import { testEmailConnection, sendOTPEmail } from './emailService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testEmailSetup = async () => {
  console.log('🧪 Testing Email Service Setup...\n');

  // Check environment variables
  console.log('1️⃣ Checking environment variables:');
  console.log('   EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Missing');
  console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ Missing');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n❌ Please set EMAIL_USER and EMAIL_PASS in your .env file');
    console.log('\n📝 Setup instructions:');
    console.log('1. Go to Google Account settings');
    console.log('2. Security → 2-Step Verification (enable first)');
    console.log('3. App passwords → Select app: Mail → Generate');
    console.log('4. Add to .env:');
    console.log('   EMAIL_USER=your_email@gmail.com');
    console.log('   EMAIL_PASS=your_16_character_app_password');
    return;
  }

  // Test connection
  console.log('\n2️⃣ Testing email connection:');
  const connectionTest = await testEmailConnection();
  if (!connectionTest.success) {
    console.log('❌ Connection failed:', connectionTest.error);
    return;
  }

  // Test sending OTP email
  console.log('\n3️⃣ Testing OTP email sending:');
  try {
    const testEmail = process.env.EMAIL_USER; // Send to self for testing
    const result = await sendOTPEmail(testEmail, 'Test User', '123456');
    console.log('✅ Test email sent successfully!');
    console.log('📧 Check your inbox:', testEmail);
  } catch (error) {
    console.log('❌ Failed to send test email:', error.message);
  }

  console.log('\n🎉 Email service test completed!');
};

// Run test
testEmailSetup().catch(console.error);