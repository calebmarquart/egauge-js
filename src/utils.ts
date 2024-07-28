//
// utils.ts
//
// Created by Caleb on 2024-02-03
//

// Import libraries
import crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';

// Import other content

// Configuration

/**
 * Rounds a number to a certain number of decimal places.
 *
 * @param number The number to round.
 * @param decimalPlaces The number of decimal places to round to.
 * @returns The rounded number.
 */
export function round(number: number, decimalPlaces = 6): number {
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
 * @param data An array of items to hash together
 * @returns A hashed string in hexadecimal
 */
export function hash(data: string[]): string {
    const hash = crypto.createHash('md5');
    hash.update(data.join(':'));
    return hash.digest('hex');
}

/**
 * Checks to see if a JWT is expired.
 *
 * @param token The JWT token to decode and check for expiration
 * @param offset The number of seconds it will renew before it actually expires (as a buffer)
 * @returns Whether or not the token is expired
 */
export function isTokenExpired(token: string, offset = 60): boolean {
    try {
        const decoded = jwt.decode(token, { complete: true });

        if (decoded && decoded.payload) {
            const payload = decoded.payload as JwtPayload;
            const exp = (payload.exp! + offset) * 1000;
            const now = Date.now();

            return now > exp;
        }

        return true;
    } catch (error) {
        return true;
    }
}
