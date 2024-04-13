//
// csv.js
//
// Created by Caleb on 2024-02-05
//

// Import libraries
const fs = require('fs');
const dayjs = require('dayjs');

// Import other content
const Device = require('./egauge');

// Configuration
const config = require('./config.json');

/**
 * Collect a range of data to a file.
 *
 * @param {Device} device The eGauge identifier.
 * @param {string} startTime The start timestamp.
 * @param {string} endTime The end timestamp.
 * @param {string} path The file path to where the CSV will be written.
 */
async function writeCSV(device, startTime, endTime, interval, path) {
    const startUnix = dayjs(startTime).unix();
    const endUnix = dayjs(endTime).unix();

    const file = fs.createWriteStream(path);

    const data = await device.getValuesForRange(startUnix, endUnix, interval);

    const headerRow = `Timestamp,` + Object.keys(data).join(',') + '\n';
    file.write(headerRow);

    let time = startUnix;
    const dataCount = data[Object.keys(data)[0]].length;

    for (let i = 0; i < dataCount; i++) {
        const timeFormat = dayjs(time * 1000).format(config.timestamp_format);
        const row = Object.values(data).map((array) => array[i]);
        const rowFormat = timeFormat + ',' + row.join(',') + '\n';

        file.write(rowFormat);

        time += interval;
    }

    file.close();
}

// Export the module(s)
module.exports = {
    writeCSV,
};
