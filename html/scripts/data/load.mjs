// load thermostats and data from the server and display them

import state from '../state.mjs';
import settings from '../utils/settings.mjs';
import { fetchData, fetchSystem } from './api.mjs';
import {
	expandTimestamps, extractData, convertTimestamp, readSystemInfo, scanAllData,
} from './parse.mjs';
import { makeSeriesInfo } from './series.mjs';
import { showData } from '../view.mjs';
import { setLoading, showError } from '../ui/dialog.mjs';
import { listThermostats, setThermostat } from '../ui/thermostats.mjs';
import quickRange from '../ui/quickrange.mjs';

// format data
// formats the minified data into proper pairs and timestamps
const formatData = (json) => {
	// the server responds with no content when there is no data in the requested range
	if (!json) {
		showError('No data was found for the selected dates.');
		return;
	}
	// test for error condition and post to user
	if (typeof json.error !== 'undefined') {
		showError(json.error);
		return;
	}
	// a table with no rows in the range is sent as an empty object
	const empty = { columnNames: [], data: [] };
	const thermostatData = json.thermostat.data ? json.thermostat : empty;
	const sensorData = json.sensor.data ? json.sensor : empty;

	// parse the data
	state.seriesInfo = makeSeriesInfo(state.systemInfo);
	const rawData = {
		thermostat: expandTimestamps(thermostatData.data, 0),
		sensor: expandTimestamps(sensorData.data, 0),
		thermostatColumns: thermostatData.columnNames,
		sensorColumns: sensorData.columnNames,
	};

	// set up visibility for first run if necessary, restoring any series that were turned off on a previous visit
	const hidden = settings.load().hidden ?? [];
	state.visible = state.seriesInfo.map((series, i) => ((state.firstLoad || state.visible[i] === undefined) ? !hidden.includes(series.name) : state.visible[i]));

	// extract the plot options
	const { metaData } = state;
	metaData.hourly = json.hourly;
	metaData.daily = json.daily;
	// occupancy is only available in the 5 minute data, hide its button otherwise
	const $occupancy = $('label[for=occup-touch]');
	if ($occupancy.is(':visible') === (metaData.hourly || metaData.daily)) {
		$occupancy.fadeToggle();
	}

	metaData.oldestData = json.oldestTimestamp;

	// populate initial min and max
	metaData.minTimestamp = scanAllData([[0, thermostatData.data], [0, sensorData.data]], (a, b) => Math.min(a, b), Infinity);
	metaData.maxTimestamp = scanAllData([[0, thermostatData.data], [0, sensorData.data]], (a, b) => Math.max(a, b), 0);

	// loop through each series and format data as {x: [x1, x2, ...], y: [y1, y2, ...]} pair
	state.data = state.seriesInfo.map((series) => {
		// extract the appropriate array and column for the specified series
		const extractedData = extractData(series, rawData);
		if (!extractedData) return false;
		const { values, column } = extractedData;
		// loop through the provided column and extract values
		const xyPairs = { x: [], y: [] };
		values.forEach((value) => {
			// skip values that are null or undefined, or zero for equipment
			if (value[column] === null || value[column] === undefined || (series.type === 'equip' && value[column] === 0)) return;
			xyPairs.x.push((new Date(convertTimestamp(value[0]))).toISOString());
			xyPairs.y.push(value[column]);
		});
		return xyPairs;
	});

	showData();
};

// get data
// start date and end date are milliseconds since the unix epoch, hourly and daily are boolean
// checks are made on server side
export const getData = async (_thermostat, startDate, endDate, hourly, daily) => {
	// save the thermostat if provided
	if (_thermostat) {
		state.activeThermostat = _thermostat;
	}
	setLoading(true);
	try {
		formatData(await fetchData({
			thermostat: state.activeThermostat, startDate, endDate, hourly, daily,
		}));
	} catch (e) {
		console.error(e);
		// ajax failures have a status, anything else happened while displaying the data
		if (e.status !== undefined) {
			showError(`Unable to load data from the server (${e.status ? `${e.status} ${e.statusText}` : 'no response'}).`);
		} else {
			showError(`Unable to display the data: ${e.message}`);
		}
	} finally {
		setLoading(false);
	}
};

// get system info
// then load data using the remembered thermostat, range and interval
export const getSystem = async () => {
	setLoading(true);
	try {
		state.systemInfo = readSystemInfo(await fetchSystem());

		// default to the first thermostat and the server's default range
		const saved = settings.load();
		const thermostat = state.systemInfo[saved.thermostat] ? saved.thermostat : Object.keys(state.systemInfo)[0];
		let start;
		let end;
		if (saved.range?.quick) {
			const range = quickRange(saved.range.quick);
			start = range.start.toMillis();
			end = range.end.toMillis();
		} else if (saved.range) {
			({ start, end } = saved.range);
		}
		getData(thermostat, start, end, saved.interval === 'hourly', saved.interval === 'daily');
		listThermostats(state.systemInfo);
		setThermostat(thermostat);
	} catch (e) {
		console.error(e);
		showError('Unable to load the list of thermostats from the server.');
	} finally {
		setLoading(false);
	}
};
