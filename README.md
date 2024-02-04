# eGauge.js

_An API wrapper for the eGauge JSON Web API_

## About

This project was built to make interacting with the [eGauge API](https://kb.egauge.net/books/egauge-meter-communication/chapter/json-webapi) a little bit easier. The main thing that I needed to do was enter a timestamp and get the register data back for that timestamp...turns out its not that easy. eGauges use accumulative values, quantum multipliers, and digest based authentication. This wrapper, although does not touch on all of the features offered, does what I need it to do and I hope it can help out some other developers as well!

**Why use the JSON API?** The eGauge JSON API is intended to replace the XML eventually and there are also many more features and endpoints that the JSON version offers, which I assume new features will be added as well. And, let's be honest, JSON is much better than dealing with XML in JavaScript.

## Getting Started

1. Clone the repo

    ```
    git clone https://github.com/calebmarquart/egauge-js.git
    ```

2. Install node modules
    ```
    cd egauge-js
    npm ci
    ```

## Usage

The main class is found in `egauge.js` which contains the `Device` class. This class accepts the eGauge identifier (found on the eGauge device label, ex: eGauge12345) as well as a username and password that will allow access to the device.

To get data, use one of the following methods on the `Device` object:

-   `getValuesAtTime()` to get the register data for a single timestamp
-   `getValuesForRange()` to get the register data for a range of timestamps (includes an interval)

### Example

```js
const eGaugeID = 'eGauge12345';
const username = 'my_username';
const password = 'my_password';

const device = new Device(eGaugeID, username, password);

const data = await device.getValuesAtTime(1700000000);

console.dir(data);
```

The response looks something like this:

```js
{
    register_1: 10,
    register_2: 20.1,
    register_3: 30.6,
    register_4: 10.2,
    register_5: 19.7,
    ...
}
```

where `register_#` is the actual name of the register and its corresponding value for that timestamp.

# Contributors

Owner, Caleb Marquart

**Note:** This project is still in early stages so feel free to leave a pull request for any changes that might help with your projects too!
