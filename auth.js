// @ts-check
//
// auth.js
//
// Created by Caleb on 2024-02-02
//

// Import libraries
const crypto = require('crypto');

// Import content from other files
const { hash } = require('./utils');

/**
 * Fetches an API token to use for eGauge requests.
 *
 * @param {string} eGaugeID The identifier of the eGauge
 * @param {string} username The account username
 * @param {string} password The account password
 * @returns {Promise<string>} The JWT token
 */
async function fetchToken(eGaugeID, username, password) {
    return new Promise((resolve, reject) => {
        const unauthorizedEndpoint = `https://${eGaugeID}.d.egauge.net/api/auth/unauthorized`;
        fetch(unauthorizedEndpoint)
            .then((response) => response.json())
            .then((data) => {
                const { rlm, nnc } = data;
                const payload = createPayload(username, password, rlm, nnc);
                const loginEndpoint = `https://${eGaugeID}.d.egauge.net/api/auth/login`;
                return fetch(loginEndpoint, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            })
            .then((response) => response.json())
            .then((data) => resolve(data.jwt))
            .catch((error) => reject(error));
    });
}

/**
 * Create the authentication payload for digest auth to be sent to eGauge for login token.
 *
 * @param {string} username The account username
 * @param {string} password The account password
 * @param {string} realm The realm by request from eGauge
 * @param {string} nonce The nonce by request from eGauge
 * @returns {object} The auth payload
 */
function createPayload(username, password, realm, nonce) {
    const cnnc = crypto.randomBytes(64).toString('hex');
    const ha1 = hash([username, realm, password]);
    const ha2 = hash([ha1, nonce, cnnc]);

    return {
        usr: username,
        rlm: realm,
        nnc: nonce,
        cnnc: cnnc,
        hash: ha2,
    };
}

// Export the module(s)
module.exports = fetchToken;
