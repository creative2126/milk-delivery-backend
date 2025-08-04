function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateOtpExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
}

module.exports = {
  generateOtp,
  generateOtpExpiry
};
