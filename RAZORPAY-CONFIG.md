# Razorpay Test Configuration

## Test Credentials
The application has been updated with new Razorpay test credentials:

- **Key ID**: `rzp_test_amonk8Ow16WyvE`
- **Secret Key**: `NPoKf4KIga8XfW369c9ygs37`

## Configuration Files
The credentials are configured in:
- `backend/razorpay-utils-enhanced.js` - Main Razorpay integration file

## Environment Variables
You can override the test credentials using environment variables:
- `RAZORPAY_KEY_ID` - Override the key ID
- `RAZORPAY_KEY_SECRET` - Override the secret key

## Usage
These test credentials are automatically used for:
- Payment order creation
- Payment verification
- Signature validation
- Webhook handling

## Testing
To test the payment flow:
1. Use the provided test credentials
2. Use Razorpay's test card numbers
3. Test both successful and failed payment scenarios

## Razorpay Test Cards
For testing purposes, use these test card numbers:
- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- **OTP Required**: 4111 1111 1111 1111 (enter 123456 as OTP)

## Security Note
These are test credentials only. For production, replace with your live Razorpay credentials and use environment variables for security.
