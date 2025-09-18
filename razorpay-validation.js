const axios = require('axios');
const { getCredentials } = require('./razorpay-config');

/**
 * Enhanced Razorpay validation service
 * Handles account validation and payment verification with proper error handling
 */
class RazorpayValidationService {
  constructor() {
    this.baseUrl = 'https://api.razorpay.com/v1';
    this.credentials = getCredentials();
  }

  /**
   * Validate account details with Razorpay
   * @param {string} sessionToken - Razorpay session token
   * @returns {Promise<Object>} Validation result
   */
  async validateAccount(sessionToken) {
    try {
      const url = `${this.baseUrl}/standard_checkout/payments/validate/account`;
      const params = new URLSearchParams({
        key_id: this.credentials.key_id,
        session_token: sessionToken
      });

      const response = await axios.post(`${url}?${params.toString()}`, {}, {
        auth: {
          username: this.credentials.key_id,
          password: this.credentials.key_secret
        },
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MilkDeliveryApp/1.0'
        }
      });

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleValidationError(error);
    }
  }

  /**
   * Handle validation errors with detailed error messages
   * @param {Error} error - The error object
   * @returns {Object} Formatted error response
   */
  handleValidationError(error) {
    let errorResponse = {
      success: false,
      timestamp: new Date().toISOString(),
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Account validation failed',
        details: error.message
      }
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.error = {
        code: error.response.status,
        message: error.response.data?.error?.description || 'Razorpay validation error',
        details: error.response.data
      };
    } else if (error.request) {
      // Request was made but no response received
      errorResponse.error = {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to Razorpay servers',
        details: 'Please check your internet connection and try again'
      };
    } else {
      // Something else happened
      errorResponse.error = {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error.message
      };
    }

    return errorResponse;
  }

  /**
   * Check if Razorpay credentials are valid
   * @returns {Promise<Object>} Credential validation result
   */
  async validateCredentials() {
    try {
      const url = `${this.baseUrl}/payments`;
      const response = await axios.get(url, {
        auth: {
          username: this.credentials.key_id,
          password: this.credentials.key_secret
        },
        timeout: 5000
      });

      return {
        success: true,
        message: 'Credentials are valid',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid credentials or service unavailable',
        error: error.response?.status === 401 ? 'Invalid credentials' : 'Service unavailable'
      };
    }
  }

  /**
   * Get detailed error information for debugging
   * @param {Object} errorData - Error data from validation
   * @returns {Object} Debug information
   */
  getDebugInfo(errorData) {
    return {
      timestamp: new Date().toISOString(),
      credentials: {
        key_id: this.credentials.key_id,
        key_secret_masked: this.credentials.key_secret ? '***' + this.credentials.key_secret.slice(-4) : 'not_set'
      },
      error: errorData,
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

module.exports = new RazorpayValidationService();
