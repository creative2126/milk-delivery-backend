/**
 * Utility functions for address validation and formatting
 */

/**
 * Validate address string for length and allowed characters
 * @param {string} address
 * @returns {boolean}
 */
function validateAddress(address) {
  if (typeof address !== 'string') return false;
  const trimmed = address.trim();
  if (trimmed.length === 0 || trimmed.length > 500) return false;
  // Allow letters, numbers, spaces, commas, dots, hyphens, and basic punctuation
  const regex = /^[a-zA-Z0-9\s,.'-]+$/;
  return regex.test(trimmed);
}

/**
 * Sanitize address string by trimming and removing extra spaces
 * @param {string} address
 * @returns {string}
 */
function sanitizeAddress(address) {
  if (typeof address !== 'string') return '';
  return address.trim().replace(/\s+/g, ' ');
}

/**
 * Validate building name string
 * @param {string} buildingName
 * @returns {boolean}
 */
function validateBuildingName(buildingName) {
  if (typeof buildingName !== 'string') return false;
  const trimmed = buildingName.trim();
  if (trimmed.length === 0 || trimmed.length > 255) return false;
  const regex = /^[a-zA-Z0-9\s,.'-]+$/;
  return regex.test(trimmed);
}

/**
 * Sanitize building name string
 * @param {string} buildingName
 * @returns {string}
 */
function sanitizeBuildingName(buildingName) {
  if (typeof buildingName !== 'string') return '';
  return buildingName.trim().replace(/\s+/g, ' ');
}

/**
 * Validate flat number string
 * @param {string} flatNumber
 * @returns {boolean}
 */
function validateFlatNumber(flatNumber) {
  if (typeof flatNumber !== 'string') return false;
  const trimmed = flatNumber.trim();
  if (trimmed.length === 0 || trimmed.length > 50) return false;
  const regex = /^[a-zA-Z0-9\s,.'-]+$/;
  return regex.test(trimmed);
}

/**
 * Sanitize flat number string
 * @param {string} flatNumber
 * @returns {string}
 */
function sanitizeFlatNumber(flatNumber) {
  if (typeof flatNumber !== 'string') return '';
  return flatNumber.trim().replace(/\s+/g, ' ');
}

module.exports = {
  validateAddress,
  sanitizeAddress,
  validateBuildingName,
  sanitizeBuildingName,
  validateFlatNumber,
  sanitizeFlatNumber
};
