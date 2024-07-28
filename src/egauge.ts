//
// egauge.ts
//
// Created by Caleb on 2024-02-02
//

// Import libraries
import crypto from 'crypto';

// Import other content
import { DeviceConfig, EpochResponse, RegisterResponse } from './types';
import { isTokenExpired, round } from './utils';
import { hash } from './utils';

// Configuration
import { multipliers } from './config.json';

export default class Device {
    private eGaugeId: string;
    private username: string;
    private password: string;
    private token: string | null;

    /**
     * A class that contains all the methods for interacting with the eGauge JSON API.
     *
     * @param eGaugeId The identifier of the eGauge.
     * @param username The username of the account.
     * @param password The password of the account.
     */
    constructor(config: DeviceConfig) {
        this.eGaugeId = config.eGaugeId;
        this.username = config.auth.username;
        this.password = config.auth.password;
        this.token = null;
    }

    /**
     * Gets a JWT authorization token for the eGauge device.
     *
     * @param refresh Option to force refresh the token, for example if 401 error is returned elsewhere (default false)
     * @returns The JWT token for eGauge authentication.
     */
    private async getToken(refresh = false): Promise<string> {
        if (this.token && !isTokenExpired(this.token) && !refresh) {
            return this.token;
        } else {
            const token = await fetchToken(
                this.eGaugeId,
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
     * @param endpoint The name of the endpoint to get data from
     * @param  params An object of URL params where the keys are the param name and values are the values
     * @returns The data object returned from the response
     */
    private async getRequest(endpoint: string, params = {}): Promise<object> {
        const token = await this.getToken();
        const urlParams = new URLSearchParams(params);

        const url = `https://${this.eGaugeId}.d.egauge.net/api${endpoint}?${urlParams}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json().catch(() => null);

        if (response.ok) {
            return data;
        } else if (response.status === 401) {
            const token = await this.getToken(true);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json().catch(() => null);

            if (response.ok) {
                return data;
            } else {
                throw handleResponseStatus(response.status, data);
            }
        } else {
            throw handleResponseStatus(response.status, data);
        }
    }

    /**
     * Makes a post request.
     *
     * @param endpoint The name of the endpoint to get data from.
     * @param body The POST request body.
     * @param params Optional URL parameters.
     * @returns The fetch response.
     */
    private async postRequest(
        endpoint: string,
        body: object,
        params = {}
    ): Promise<object> {
        const token = await this.getToken();

        const urlParams = new URLSearchParams(params);

        const url = `https://${this.eGaugeId}.d.egauge.net/api${endpoint}?${urlParams}`;

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json().catch(() => null);

        if (response.ok) {
            return data;
        } else if (response.status == 401) {
            const token = await this.getToken(true);
            const response = await fetch(url, {
                method: 'GET',
                body: JSON.stringify(body),
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json().catch(() => null);

            if (response.ok) {
                return data;
            } else {
                throw handleResponseStatus(response.status, data);
            }
        } else {
            throw handleResponseStatus(response.status, data);
        }
    }

    /**
     * Get the average register values for a certain timestamp sampled over a certain interval.
     *
     * @param unix A UNIX timestamp value for the requested data.
     * @param interval The number of seconds to sample over (default: 1 minute)
     */
    async getRegistersAtTime(unix: number, interval = 60) {
        try {
            const params = {
                time: `${unix - interval}:${interval}:${unix}`,
            };

            const data = (await this.getRequest(
                '/register',
                params
            )) as RegisterResponse;

            const rows = data.ranges[0].rows;
            const regCount = data.registers.length;
            const end = rows[0] ?? new Array(regCount).fill(0);
            const start = rows[1] ?? end;

            const registers: { [name: string]: number } = {};

            for (let i = 0; i < regCount; i++) {
                const { name, type } = data.registers[i];
                const diff = parseInt(end[i]) - parseInt(start[i]);
                const val = round(
                    (diff / interval) *
                        (multipliers as { [key: string]: number })[type]
                );
                registers[name] = val;
            }

            return registers;
        } catch (error) {
            throw handleEgaugeError(error);
        }
    }

    /**
     * Gets the register values for a range of timestamp (including the first and last timestmap) for a certain interval.
     *
     * @param startUnix The UNIX timestamp of the first data value
     * @param endUnix The UNIX timestamp of the last data value (included)
     * @param interval The number of seconds in between data rows (default: 1 minute)
     * @returns The registers with values
     */
    async getValuesForRange(
        startUnix: number,
        endUnix: number,
        interval = 60
    ): Promise<object> {
        try {
            const params = {
                time: `${startUnix - interval}:${interval}:${endUnix}`,
            };

            const data = (await this.getRequest(
                '/register',
                params
            )) as RegisterResponse;

            const range = data.ranges?.[0];

            const rows = range?.rows ?? [];
            const count = rows.length;

            if (count === 0) {
                return [];
            }

            const ts = parseInt(range.ts);
            const delta = range.delta;

            const registers = data.registers;

            const finalValues = [];

            for (let i = 0; i < count - 1; i++) {
                const unix = ts - i * delta;
                const firstRow = rows[i + 1];
                const secondRow = rows[i];

                const currentRegisters: { [name: string]: number } = {};

                for (let j = 0; j < registers.length; j++) {
                    const { name, type } = registers[j];
                    const diff = parseInt(secondRow[j]) - parseInt(firstRow[j]);
                    const value = round(
                        (diff / delta) *
                            (multipliers as { [key: string]: number })[type]
                    );
                    currentRegisters[name] = value;
                }

                finalValues.push({
                    time: unix,
                    registers: currentRegisters,
                });
            }

            return finalValues.reverse();
        } catch (error) {
            throw handleEgaugeError(error);
        }
    }

    /**
     * Gets the time when the meter started recording, known as the epoch.
     *
     * @returns The UNIX timestamp for the meter epoch
     */
    async getEpoch(): Promise<number> {
        try {
            const data = (await this.getRequest(
                '/config/db/epoch'
            )) as EpochResponse;
            return parseInt(data.result);
        } catch (error) {
            throw handleEgaugeError(error);
        }
    }

    /**
     * Gets the instantaneous rate data from eGauge.
     *
     * @returns The register response object.
     */
    async getCurrentRegisters(): Promise<object> {
        const params = {
            rate: '',
        };

        const data = (await this.getRequest(
            '/register',
            params
        )) as RegisterResponse;

        const registers: { [name: string]: number } = {};

        for (const register of data.registers) {
            const { name, rate } = register;
            const value = round(rate!);
            registers[name] = value;
        }

        return registers;
    }

    /**
     * Reboots the eGauge device.
     */
    async reboot() {
        try {
            const endpoint = '/cmd/reboot';

            await this.postRequest(endpoint, {});
        } catch (error) {
            throw handleEgaugeError(error);
        }
    }

    /**
     * Gets the current time on the device as a UNIX timestamp.
     *
     * @returns The UNIX timestamp number.
     */
    async getTime(): Promise<number> {
        try {
            const endpoint = '/sys/time';
            const data = (await this.getRequest(endpoint)) as EpochResponse;
            return parseFloat(data.result);
        } catch (error) {
            throw handleEgaugeError(error);
        }
    }

    /**
     * Gets the number of seconds of uptime since last reboot.
     *
     * @returns The number of seconds.
     */
    async getUptime(): Promise<number> {
        try {
            const endpoint = '/sys/uptime';
            const data = (await this.getRequest(endpoint)) as EpochResponse;
            return parseFloat(data.result);
        } catch (error) {
            throw handleEgaugeError(error);
        }
    }
}

class EGaugeError extends Error {
    type: string;
    data: any;

    constructor(message: string, type: string, data: any) {
        super(message);
        this.type = type;
        this.data = data;
    }
}

function handleEgaugeError(error: any): EGaugeError {
    if (error instanceof EGaugeError) {
        return error;
    } else {
        return new EGaugeError(
            'Error parsing eGauge response.',
            'PARSE',
            error
        );
    }
}

function handleResponseStatus(status: number, data: any): EGaugeError {
    switch (status) {
        case 400:
            return new EGaugeError(
                'Bad eGauge request made.',
                'BAD_REQUEST',
                data
            );
        case 403:
            return new EGaugeError(
                'Operation not permitted with this account.',
                'FORBIDDEN',
                data
            );
        case 404:
            return new EGaugeError(
                'eGauge or endpoint not found.',
                'NOT_FOUND',
                data
            );
        case 500:
            return new EGaugeError(
                'eGauge device error. Please troubleshoot the device directly.',
                'SERVER',
                data
            );
        default:
            return new EGaugeError(
                'Unknown eGauge request error.',
                'UNKNOWN',
                data
            );
    }
}

/**
 * Fetches an API token to use for eGauge requests.
 *
 * @param {string} eGaugeId The identifier of the eGauge
 * @param {string} username The account username
 * @param {string} password The account password
 * @returns {Promise<string>} The JWT token
 */
async function fetchToken(
    eGaugeId: string,
    username: string,
    password: string
): Promise<string> {
    return new Promise((resolve, reject) => {
        const unauthorizedEndpoint = `https://${eGaugeId}.d.egauge.net/api/auth/unauthorized`;
        fetch(unauthorizedEndpoint)
            .then((response) => response.json())
            .then((data) => {
                const { rlm, nnc } = data;
                const payload = createPayload(username, password, rlm, nnc);
                const loginEndpoint = `https://${eGaugeId}.d.egauge.net/api/auth/login`;
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
function createPayload(
    username: any,
    password: any,
    realm: any,
    nonce: any
): object {
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
