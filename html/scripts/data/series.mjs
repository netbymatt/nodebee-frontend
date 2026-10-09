// the list of series and the data for each one

import state from '../state.mjs';

// produce a loop with all sensors in the same order, with separate callbacks for sensors and thermostats
// thermostat(name, id)
// sensor(name, id, thermostat_name, thermostat_id)
// return values should be formatted as objects and are added to a new return object
const loopAllSensors = (info, thermostatCb, sensorCb) => {
	const result = {};
	Object.keys(info).forEach((thermostatId) => {
		// create a new thermostat entry
		result[thermostatId] = { name: info[thermostatId].name, sensors: {} };
		// run the callback
		const thermostatCbValue = thermostatCb(info[thermostatId].name, thermostatId);
		// add it to the return value if an object was provided
		if (typeof thermostatCbValue === 'object') result[thermostatId] = { ...result[thermostatId], ...thermostatCbValue };

		// dive into the sensors
		Object.keys(info[thermostatId].sensors).forEach((sensorId) => {
			// create a new sensor entry
			result[thermostatId].sensors[sensorId] = { name: info[thermostatId].sensors[sensorId].name, type: info[thermostatId].sensors[sensorId].type };
			// run the callback
			const sensorCbValue = sensorCb(info[thermostatId].sensors[sensorId].name, sensorId, info[thermostatId], thermostatId);
			// add it to the return value if an object was provided
			if (typeof sensorCbValue === 'object') result[thermostatId].sensors[sensorId] = { ...result[thermostatId].sensors[sensorId], ...sensorCbValue };
		});
	});
	return result;
};

// using the system info generate a list of every series to plot
export const makeSeriesInfo = (info) => {
	const names = [];
	const thermostat = (name, thermostatId) => {
		names.push({
			name: 'Fan', type: 'equip', column: 'fan', thermostatId: parseInt(thermostatId, 10),
		});
		names.push({
			name: 'Cool', type: 'equip', column: 'cool', thermostatId: parseInt(thermostatId, 10),
		});
		names.push({
			name: 'Heat', type: 'equip', column: 'heat', thermostatId: parseInt(thermostatId, 10),
		});
		names.push({
			name: 'Outside', type: 'temp', column: 'outside', thermostatId: parseInt(thermostatId, 10),
		});
		names.push({
			name: 'Setpoint', type: 'temp', column: 'setpoint', thermostatId: parseInt(thermostatId, 10),
		});
		names.push({
			name: 'Average', type: 'temp', column: 'average', thermostatId: parseInt(thermostatId, 10),
		});
	};
	const sensor = (name, sensorId, thermostatName, thermostatId) => {
		names.push({
			name: `${name}`, type: 'temp', column: 'temperature', sensorId: parseInt(sensorId, 10), thermostatId: parseInt(thermostatId, 10),
		});
		names.push({
			name: `${name} occupancy`, type: 'occup', column: 'occupancy', sensorId: parseInt(sensorId, 10), thermostatId: parseInt(thermostatId, 10),
		});
	};
	loopAllSensors(info, thermostat, sensor);
	return names;
};

// filter occupancy
// when the occupancy option is on, a sensor's temperatures are only shown while its room is occupied
export const filterOccupancy = (myData, name) => {
	// check if dataset has occupancy info
	const occupPresent = state.seriesInfo.findIndex((element) => element.name === `${name} occupancy`);
	// if no occupancy info return immediately, occupancy is not available for hourly and daily data
	if (occupPresent === -1 || !state.data[occupPresent]) return myData;
	// if occupancy option is off return immediately
	if (!state.occupancyOnly) return myData;

	// grab the occupancy data and filter for y
	const occupData = state.data[occupPresent].y;
	return {
		x: myData.x,
		y: myData.y.map((value, i) => (occupData[i] ? value : null)),
	};
};

// build table data
// the same series as the chart, with the type for formatting
export const buildTableData = () => state.data.map((values, i) => {
	const series = state.seriesInfo[i];
	if (!state.visible[i] || series.type === 'occup') return false;
	return {
		name: series.name,
		type: series.type,
		...filterOccupancy(values, series.name),
	};
}).filter((d) => d);
