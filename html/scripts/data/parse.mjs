// convert the server's responses into the forms used by the chart

import state from '../state.mjs';

// sort thermostats and sensors
export const readSystemInfo = (info) => {
	const result = {};
	info.forEach((row) => {
		// create the thermostat if necessary
		if (!result[row.thermostat_id]) result[row.thermostat_id] = { name: '', sensors: {} };
		result[row.thermostat_id].name = row.thermostat_name;
		// create the sensor
		result[row.thermostat_id].sensors[row.sensor_id] = { name: row.sensor_name };
	});
	return result;
};

// scan through all data and call a reducing function
// data is formatted as [<col number>, [[dataA1, dataA2, ...], [dataB1, dataB2, ...], ...]]
export const scanAllData = (scanData, cb, initialValue = 0) => scanData.reduce((acc, dataInfo) => {
	// create some variables for code readability
	const col = dataInfo[0];
	const dataSet = dataInfo[1];
	return cb(acc, dataSet.reduce((inAcc, inDataSet) => cb(inDataSet[col], inAcc), acc));
}, initialValue);

// expand timestamps in listed column
// timestamps are sent as an initial timestamp followed by differences for compression reasons
// this function reverses that process
export const expandTimestamps = (dataSet, col) => {
	let lastTimestamp = 0;
	return dataSet.map((_val) => {
		// get the first timestamp
		const thisTimestamp = _val[col];
		// add a new calculated timestamp back in
		const val = _val;
		val[col] = thisTimestamp + lastTimestamp;
		lastTimestamp = val[col];
		return val;
	});
};

// return the correct array and column number for the specified series
export const extractData = (series, rawData) => {
	// skip occupancy in hourly and daily, filtered out in higher level function
	if ((state.metaData.hourly || state.metaData.daily) && series.type === 'occup') return false;
	let rawValues = rawData.thermostat;
	let columns = rawData.thermostatColumns;
	// change to sensor if necessary
	if (series.sensorId ?? -1 >= 0) {
		rawValues = rawData.sensor;
		columns = rawData.sensorColumns;
	}
	// no rows were returned for this table
	if (columns.length === 0) return { values: [], column: -1 };
	// determine column
	const column = columns.indexOf(series.column);
	if (column === -1) throw new Error(`Unable to find column: ${series.name}-${series.column}`);

	// determine thermostat id column and sensorId column
	const thermostatIdCol = columns.indexOf('thermostat_id');
	const sensorIdCol = columns.indexOf('sensor_id');
	// filter the values by the provided thermostat and/or sensor number
	const values = rawValues.filter((value) => (value[thermostatIdCol] === series.thermostatId && (series.sensorId === undefined || value[sensorIdCol] === series.sensorId)));
	return {
		values,
		column,
	};
};

// convert timestamp
// convert timestamp (epoch milliseconds) to local time stored as utc, which is how plotly displays dates
// Luxon is not used here for performace reasons. There can be over 80k data points to convert.
export const convertTimestamp = (timestamp) => {
	// use the supplied timestamp to calculate offset (so DST is included)
	const d = new Date(timestamp);
	// get offset and convert to milliseconds
	const n = d.getTimezoneOffset() * 60 * 1000;

	// convert timestamp to ms
	return timestamp - n;
};
