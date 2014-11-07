var tessel = require('tessel');
var https = require('https');
var ntp = require('ntp-client');

// http://<mymobileservicename>.azure-mobile.net/api/table_connection_info?deviceId=<deviceId>
var apiUrl = "https://tesselazuremobile.azure-mobile.net/api/weatherconfig";
var firstConfig = true;

// Constants
var apiCallLed = 0;
var tableCallLed = 1;
var minRetryDelay = 3000;
var maxRetryDelay = 15000;
var secondsPerDay = 24*60*60; // 24h x 60 min x 60 sec = 86400

var deviceId = tessel.deviceId();
var config;
var measurements = [];

// Start update loop to get connection information
setImmediate(updateConnectionInfo);

function startMeasurementsAndUploads() {
	setImmediate(measure);
}

function measure() {

	// console.log('INFO Collecting weather data');

	if (config) {
		// Since Tessel doesn't have onboard clock, we'll use network time
		ntp.getNetworkTime(null, null, function(err, date) {
		    if(!err) {

		    	// console.log('- date:', date);

		    	var partitionKey = getPartitionKey(deviceId, date);
		    	var rowKey = getRowKey(date);
		    	var temperature = getTemperature();
		    	var humidity = getHumidity();

		    	var weatherLog = {
		    		PartitionKey: partitionKey,
		    		RowKey: rowKey,
		    		Temperature: temperature,
		    		Humidity: humidity,
		    		MeasuredAt: date
		    	};

		    	measurements.push(weatherLog);

		    	console.log();
		    	console.log('INFO Measurement done and saved in local cache/array');
		    	console.log('- partitionKey', partitionKey);
		    	console.log('- rowKey', rowKey);
		    	console.log('- temperature', temperature);
		    	console.log('- humidity', humidity);
		    	console.log('- measuredAt', date);

		    	// Schedule a new call to retrieve new measurements
		    	setTimeout(measure, config.measurementPeriod * 1000);

		    } else {
		    	var delay = getRandomRetryDelay();
		    	console.error('ERROR measure() Unable to retrieve network time. Trying again in', delay, 'ms');
		    	setTimeout(measure, delay);
		    }
		});
	} else {
		var delay = getRandomRetryDelay();
		console.error('ERROR measure() No configuration set. Trying again in', delay, 'ms');
		setTimeout(measure, delay);
	}
}

function updateConnectionInfo() {

	// console.log('INFO Calling', apiUrl, 'to get new configuration');
	setLed(apiCallLed, true);

	var url = apiUrl + '?deviceId=' + deviceId;

	httpGetJSON(url, function(err, result) {
		if (!err && result.authorized) {
			config = result;

			console.log();
			console.log('INFO New configuration retrieved');
			console.log('- configRefreshPeriod:', config.configRefreshPeriod);
			console.log('- measurementPeriod:', config.measurementPeriod);
			console.log('- uploadPeriod', config.uploadPeriod);
			console.log('- primaryHost:', config.host.primaryHost);
			console.log('- sas:', config.sas);

			if (firstConfig) {
				// If this is the first time we retrieve configuration start
				// measurement and upload cycles as well.

				startMeasurementsAndUploads();
				firstConfig = false;
			}

			var delay = parseInt(config.configRefreshPeriod) * 1000;

			// Schedule a new call to update connection information before SAS times out
			setTimeout(updateConnectionInfo, delay);

		} else {
			config = null;
			var delay = getRandomRetryDelay();

			console.error('ERROR Unable to get configuration. Trying again in', delay, 'ms');
			if (result && result.message)
				console.error(result.message);
			else
				console.error(err);

			setTimeout(updateConnectionInfo, delay);
		}

		setLed(apiCallLed, false);
	});
}

function httpGetJSON(url, callback) {
	https.get(url, function(res) {
		var body = '';

		res.on('data', function(data) {
			body += data;
		});

		res.on('end', function() {
			callback(null, JSON.parse(body));
		});

	}).on('error', function (err) {
		// An error occurred while calling url
		callback(err, null);
	});
}

function setLed(ledNo, val) {
	var led = tessel.led[ledNo].output(0);
	led.write(val);
}

function getRandomRetryDelay() {
	return Math.floor(Math.random() * (maxRetryDelay - minRetryDelay + 1) + minRetryDelay);
}

function getPartitionKey(deviceId, date) {
	var partitionKey =
			deviceId + '|' +
			date.getFullYear() +
			padLeft(date.getMonth() + 1, 2) +
			padLeft(date.getDay(), 2);

	return partitionKey;
}

function getRowKey(date) {
	// Generate a row key that sort the rows descending by
	// calculating number of seconds left on current day

	var secondsSinceMidnight = 
		date.getHours() * 3600 +
		date.getMinutes() * 60 +
		date.getSeconds();

	var secondsLeftToday = secondsPerDay - secondsSinceMidnight;
	var rowKey = padLeft(secondsLeftToday, 5);

	return rowKey;
}

function getTemperature() {
	// Fake implementation. Just returns a random number
	var temperature = Math.floor((Math.random() * 100) - 50);

	return temperature;
}

function getHumidity() {
	// Fake implementation. Just returns a random number
	var humidity = Math.floor((Math.random() * 100) + 1);

	return humidity;
}

function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

function padLeft(i, n, str){
    return Array(n - String(i).length + 1).join(str||'0') + i;
}