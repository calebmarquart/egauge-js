//
// egauge.js
//
// Created by Caleb on 2024-02-02
//

// Import libraries

// Import other content
const fetchToken = require('./auth');
const { isTokenExpired, round } = require('./utils');

// Configuration
const { multipliers } = require('./config.json');

class Device {
    /**
     * A class that contains all the methods for interacting with the eGauge JSON API.
     *
     * @param {string} eGaugeID The identifier of the eGauge.
     * @param {string} username The username of the account.
     * @param {string} password The password of the account.
     */
    constructor(eGaugeID, username, password) {
        this.eGaugeID = eGaugeID;
        this.username = username;
        this.password = password;
    }

    /**
     * Gets a JWT authorization token for the eGauge device.
     *
     * @param {boolean} refresh Option to force refresh the token, for example if 401 error is returned elsewhere (default false)
     * @returns {Promise<string>} The JWT token for eGauge authentication.
     */
    async getToken(refresh = false) {
        if (
            !refresh &&
            this.token !== undefined &&
            !isTokenExpired(this.token)
        ) {
            return this.token;
        } else {
            const token = await fetchToken(
                this.eGaugeID,
                this.username,
                this.password
            );

            this.token = token;
            return token;
        }
    }

    /**
     * Makes a GET request to eGauge using endpoint and params to get data.
     *
     * @param {string} endpoint The name of the endpoint to get data from
     * @param {object} params An object of URL params where the keys are the param name and values are the values
     * @returns {Promise<object>} The data object returned from the response
     */
    async getRequest(endpoint, params = {}) {
        const token = await this.getToken();
        const urlParams = new URLSearchParams(params);

        const url = `https://${this.eGaugeID}.d.egauge.net/api${endpoint}?${urlParams}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.ok) {
            return await response.json();
        } else if (response.status === 401) {
            const token = await this.getToken(true);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(response.statusText);
            }
        } else {
            throw new Error(response.statusText);
        }
    }

    /**
     * Get the average register values for a certain timestamp sampled over a certain interval.
     *
     * @param {number} unix A UNIX timestamp value for the requested data.
     * @param {number} interval The number of seconds to sample over (default: 1 minute)
     */
    async getValuesAtTime(unix, interval = 60) {
        const params = {
            time: `${unix - interval}:${interval}:${unix}`,
        };

        const data = await this.getRequest('/register', params);

        const rows = data.ranges[0].rows;
        const regCount = data.registers.length;
        const end = rows[0] ?? new Array(regCount).fill(0);
        const start = rows[1] ?? end;

        const registers = {};

        for (let i = 0; i < regCount; i++) {
            const { name, type } = data.registers[i];
            const diff = parseInt(end[i]) - parseInt(start[i]);
            const val = round((diff / interval) * multipliers[type]);
            registers[name] = val;
        }

        return registers;
    }

    /**
     * Gets the register values for a range of timestamp (including the first and last timestmap) for a certain interval.
     *
     * @param {number} startUnix The UNIX timestamp of the first data value
     * @param {number} endUnix The UNIX timestamp of the last data value (included)
     * @param {number} interval The number of seconds in between data rows (default: 1 minute)
     * @returns {Promise<object>} The registers with values
     */
    async getValuesForRange(startUnix, endUnix, interval = 60) {
        const params = {
            time: `${startUnix - interval}:${interval}:${endUnix}`,
        };

        const data = await this.getRequest('/register', params);

        const rows = data.ranges[0].rows;

        const rowCount = rows.length;
        const regCount = data.registers.length;

        const registers = {};

        for (let i = 0; i < regCount; i++) {
            const { name, type } = data.registers[i];

            let values = new Array(rowCount - 1);

            for (let j = rowCount - 1; j > 0; j--) {
                const diff = parseInt(rows[j - 1][i]) - parseInt(rows[j][i]);
                const val = round((diff / interval) * multipliers[type]);
                values[rowCount - j - 1] = val;
            }

            registers[name] = values;
        }

        return registers;
    }

    /**
     * Gets the time when the meter started recording, known as the epoch.
     *
     * @returns {Promise<number>} The UNIX timestamp for the meter epoch
     */
    async getEpoch() {
        const data = await this.getRequest('/config/db/epoch');
        return parseInt(data.result);
    }

    /**
     * Gets the instantaneous rate data from eGauge.
     *
     * @returns {Promise<object>} The register response object.
     */
    async getValuesNow() {
        const params = {
            rate: '',
        };

        const data = await this.getRequest('/register', params);

        const registers = {};

        for (const register of data.registers) {
            const { name, rate } = register;
            const value = round(rate);
            registers[name] = value;
        }

        return registers;
    }
}

// Export the module(s)
module.exports = Device;
