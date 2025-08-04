const { generateOtp, generateOtpExpiry } = require('./otp-utils');

// In-memory storage for OTPs (in production, use a database)
const otpStorage = new Map();

async function sendOtp(email) {
  const otp = generateOtp();
  const expiry = generateOtpExpiry();
  
  otpStorage.set(email, { otp, expiry });
  
  // In a real application, this would send an email
  console.log(`OTP for ${email}: ${otp}`);
  
  return otp;
}

async function verifyOtp(email, otp) {
  const stored = otpStorage.get(email);
  
  if (!stored) {
    throw new Error('OTP not found');
  }
  
  if (stored.otp !== otp) {
    throw new Error('Invalid OTP');
  }
  
  if (new Date() > stored.expiry) {
    otpStorage.delete(email);
    throw new Error('OTP expired');
  }
  
  otpStorage.delete(email);
  return true;
}

module.exports = {
  sendOtp,
  verifyOtp
};
