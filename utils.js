//
// utils.js
//
// Created by Caleb on 2024-02-03
//

// Import libraries
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Import other content

// Configuration

/**
 * Rounds a number to a certain number of decimal places.
 *
 * @param {Number} number The number to round
 * @param {Number} decimalPlaces The number of decimal places to round to
 * @returns {Number} The rounded number
 */
function round(number, decimalPlaces = 6) {
    if (decimalPlaces < 0) {
        throw new Error(
            'You must provide a positive integer for decimal places'
        );
    }
    const pow = Math.pow(10, decimalPlaces);
    return Math.round(number * pow) / pow;
}

/**
 * Hashes items together using the MD5 algorithmn.
 *
 * @param {Array<String>} data An array of items to hash together
 * @returns {String} A hashed string in hexadecimal
 */
function hash(data) {
    const hash = crypto.createHash('md5');
    hash.update(data.join(':'));
    return hash.digest('hex');
}

/**
 * Checks to see if a JWT is expired.
 *
 * @param {String} token The JWT token to decode and check for expiration
 * @param {Number?} offset The number of seconds it will renew before it actually expires (as a buffer)
 * @returns {Bool} Whether or not the token is expired
 */
function isTokenExpired(token, offset = 60) {
    try {
        const decoded = jwt.decode(token, { complete: true });

        if (!decoded || !decoded.payload || !decoded.payload.exp) {
            return true;
        }

        const exp = (decoded.payload.exp + offset) * 1000;
        const now = Date.now();

        return now > exp;
    } catch (error) {
        return true;
    }
}

// Export the module(s)
module.exports = {
    hash,
    isTokenExpired,
    round,
};
