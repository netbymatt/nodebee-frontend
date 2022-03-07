// v1.1
// launch
$(() => {
	nodebee.init();
});

/* global luxon, table, Plotly, config */

const nodebee = (() => {
	const { DateTime } = luxon;	// alias object
	let activeThermostat;
	let data = [];		// data to plot
	const metaData = {			// metadata
		minTimestamp: null,
		maxTimestamp: null,
		hourly: false,
		daily: false,
		oldestData: null,
	};
	let systemInfo = {};	// thermostats and their sensors
	let seriesInfo = [];	// information about each series to plot
	let visible = [];	// show this series
	let firstLoad = true;
	const colors = [];	// stores colors of each series on the first run

	// init, pubic
	const init = () => {
		getSystem();

		// legend button
		$('#legend-touch').button()
			.on('click', legendClick);
		// table button
		$('#table-touch').button()
			.on('click', generateTable);

		// occupancy button
		$('#occup-touch').checkboxradio()
			.on('click', toggleOccup);
	};

	// get system info
	const getSystem = async () => {
		try {
			const system = await $.ajax({
				url: 'system',
				type: 'GET',
				dataType: 'json',
				contentType: 'application/json',
			});
			systemInfo = readSystemInfo(system);
			// default to the first thermostat
			const [thermostat] = Object.keys(systemInfo);
			getData(thermostat);
			config.listThermostats(systemInfo);
			config.setThermostat(thermostat);
		} catch (e) {
			console.log('Get system info failed');
			console.log(e);
		}
	};

	// get data, public
	// start date and end date are seconds since unix epoch
	// hourly is boolean
	// checks are made on server side
	const getData = async (_thermostat, startDate, endDate, hourly, daily) => {
		// save the thermostat if provided
		if (_thermostat) {
			activeThermostat = _thermostat;
		}
		// get the saved thermostat
		const thermostat = activeThermostat;
		try {
			const runtimeData = await $.ajax({
				url: 'data',
				type: 'POST',
				data: JSON.stringify({
					startDate,
					endDate,
					hourly,
					daily,
					thermostat,
				}),
				dataType: 'json',
				contentType: 'application/json',
			});
			formatData(runtimeData);
		} catch (e) {
			console.log('Get data failed!');
			console.log(e);
		}
	};

	// format data, private
	// formats the minified data into proper pairs and timestamps
	const formatData = (json) => {
		// test for error condition and post to user
		if (typeof json.error !== 'undefined') {
			// hide everything in the dialog box
			$('.dialog-hidden').hide(0);
			// show only the error div
			$('#dialog-error').text(json.error).show(0);
			// show the dialog
			$('#dialog').dialog('open').dialog('option', 'title', 'Error!');
			return;
		}
		// clear out old data, visible is maintained
		data = [];

		// parse the data
		seriesInfo = makeSeriesInfo(systemInfo);
		const rawData = {
			thermostat: expandTimestamps(json.thermostat.data, 0),
			sensor: expandTimestamps(json.sensor.data, 0),
			thermostatColumns: json.thermostat.columnNames,
			sensorColumns: json.sensor.columnNames,
		};

		// set up visibility for first run if necessary
		visible = seriesInfo.map((val, i) => ((firstLoad || visible[i] === undefined) ? true : visible[i]));

		// extract the plot options
		metaData.hourly = json.hourly;
		metaData.daily = json.daily;
		// set visibility of occupancy button
		if ($('#occup-touch').is(':visible') === (metaData.hourly || metaData.daily)) {
			$('#occup-touch').parent().fadeToggle();
		}

		metaData.oldestData = json.oldestTimestamp;

		// populate initial min and max
		metaData.minTimestamp = scanAllData([[0, json.thermostat.data], [0, json.sensor.data]], (a, b) => Math.min(a, b), Infinity);
		metaData.maxTimestamp = scanAllData([[0, json.thermostat.data], [0, json.sensor.data]], (a, b) => Math.max(a, b), 0);

		// loop through each series and format data as {x: [x1, x2, ...], y: [y1, y2, ...]} pair
		data = seriesInfo.map((series) => {
			// extract the appropriate array and column for the specified series
			const extractedData = extractData(series, rawData);
			if (!extractedData) return false;
			const { values, column } = extractedData;
			// loop through the provided column and extract values
			const xyPairs = { x: [], y: [] };
			values.forEach((value) => {
				// skip values that are null or undefined, or zero for equipment
				if (value[column] === null || value[column] === undefined || (series.type === 'equip' && value[column] === 0)) return false;
				xyPairs.x.push((new Date(convertTimestamp(value[0]))).toISOString());
				xyPairs.y.push(value[column]);
				return true;
			});
			return xyPairs;
		});	// remove unused series

		plotData(buildDataSet());
		// TODO
		// table.updateTable(data, legends, visible, yaxes);
	};

	// sort thermostats and sensors
	const readSystemInfo = (info) => {
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
	const makeSeriesInfo = (info) => {
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

	// scan through all data and call a reducing function
	// data is formatted as [<col number>, [[dataA1, dataA2, ...], [dataB1, dataB2, ...], ...]]
	const scanAllData = (scanData, cb, initialValue = 0) => scanData.reduce((acc, dataInfo) => {
		// create some variables for code readability
		const col = dataInfo[0];
		const dataSet = dataInfo[1];
		return cb(acc, dataSet.reduce((inAcc, inDataSet) => cb(inDataSet[col], inAcc), acc));
	}, initialValue);

	// expand timestamps in listed column
	// timestamps are sent as an initial timestamp followed by differences for compression reasons
	// this function reverses that process
	const expandTimestamps = (dataSet, col) => {
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
	const extractData = (series, rawData) => {
		// skip occupancy in hourly and daily, filtered out in higher level function
		if ((metaData.hourly || metaData.daily) && series.type === 'occup') return false;
		let rawValues = rawData.thermostat;
		let columns = rawData.thermostatColumns;
		// change to sensor if necessary
		if (series.sensorId ?? -1 >= 0) {
			rawValues = rawData.sensor;
			columns = rawData.sensorColumns;
		}
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

	// convert timestamp, private
	// convert timestamp (epoch seconds) to local javascript time
	// Luxon is not used here for performace reasons. There can be over 80k data points to convert.
	const convertTimestamp = (timestamp) => {
		// use the supplied timestamp to calculate offset (so DST is included)
		const d = new Date(timestamp);
		// get offset and convert to milliseconds
		const n = d.getTimezoneOffset() * 60 * 1000;

		// convert timestamp to ms
		return timestamp - n;
	};

	// build data set, private
	// takes global data and returns an object formatted for flot
	const buildDataSet = () => {
		const set = data.map((values, i) => {
			// grab the series
			const series = seriesInfo[i];
			// only plot if visible is set, and not occupancy
			if (!visible[i] || series.type === 'occup') return false;
			// get x and y data sets
			const { x, y } = filterOccupancy(values, series.name);
			return {
				x,
				y,
				name: series.name,
				yaxis: getAxisNum(series.type),
				...getBarType(series.type),
				...colorByLegend(series.name),
			};
			// filter for data that is visible
		});
		return set.filter((d) => d);
	};

	// color by legend, private
	// return a set color for each legend
	const colorByLegend = (legend) => {
		// bars
		if (legend.match(/fan$/i)) return { marker: { color: 'rgba(237, 194, 64, 0.4)' } };
		if (legend.match(/cool$/i)) return { marker: { color: 'rgba(175, 216, 248, 0.4)' } };
		if (legend.match(/heat$/i)) return { marker: { color: 'rgba(203, 75, 75, 0.4)' } };
		// lines
		if (legend.match(/average$/i)) return { line: { color: 'rgba(64, 223, 237, 0.25)', width: 5 } };
		if (legend.match(/setpoint$/i)) return { line: { color: 'rgba(142, 64, 237, 0.4)' } };
		if (legend.match(/outside$/i)) return { line: { color: 'rgba(123, 210, 98, 0.4)' } };
		if (legend.match(/outside max$/i)) return { line: { color: 'rgba(255, 70, 70, 0.4)' } };
		if (legend.match(/outside min$/i)) return { line: { color: 'rgba(73, 64, 247, 0.4)' } };

		return undefined;
	};

	// skip some data, private
	// skips some data points based on how many can be drawn in in the visible area
	const filterOccupancy = (myData, name) => {
		// check if dataset has occupancy info
		const occupPresent = seriesInfo.findIndex((element) => element.name === `${name} occupancy`);
		// if no occupancy info return immediately
		if (!occupPresent) return myData;
		// if occupancy option is off return immediately
		if (!$('#occup-touch').is(':checked')) return myData;

		let { y } = myData;
		// grab the occupancy data and filter for y
		if (occupPresent > -1 && $('#occup-touch').is(':checked')) {
			const occupData = data[occupPresent].y;
			y = myData.y.map((value, i) => (occupData[i] ? value : null));
		}

		return {
			x: myData.x,
			y,
		};
	};

	// plot data, public
	const plotData = (dataToPlot, xRange) => {
		// y axis max is based on the plot type
		let yAxisMax = 5;	// default, 5 minutes
		if (metaData.hourly) yAxisMax = 60; // hours
		if (metaData.daily) yAxisMax = 24; // minutes

		// get the chart
		const chart = document.getElementById('chart');

		// determine range of data to plot
		let rangeXMin = xRange?.[0] ?? DateTime.fromMillis(metaData.minTimestamp).toISO();
		const rangeXMax = xRange?.[1] ?? DateTime.fromMillis(metaData.maxTimestamp).toISO();
		if (firstLoad) {
			rangeXMin = DateTime.local().minus({ days: 1 }).startOf('day').toISO();
		}

		// configure the layout
		const layout = {
			title: systemInfo[activeThermostat].name,
			showlegend: false,
			barmode: 'overlay',
			hovermode: 'closest',
			dragmode: 'pan',
			margin: {
				l: 30, r: 30, b: 40, t: 30,
			},
			xaxis: {
				range: [rangeXMin, rangeXMax],
				rangeselector: {
					buttons: [
						{
							count: 1,
							label: '1m',
							step: 'month',
							stepmode: 'backward',
						},
						{
							count: 7,
							label: '1w',
							step: 'day',
							stepmode: 'backward',
						},
						{ step: 'all' },
					],
				},
				showgrid: true,
				gridwidth: 2,
				gridcolor: '#0000A0',
				// rangeslider: { range: [DateTime.fromMillis(metaData.minTimestamp).toISO(), DateTime.fromMillis(metaData.maxTimestamp).toISO()], bgcolor: '#eee' },
				type: 'date',
				hoverformat: '%m/%d %I:%M %p',
				ticklabelposition: 'outside right',
			},
			// equipment
			yaxis: {
				side: 'left',
				range: [0, yAxisMax],
				rangemode: 'tozero',
				fixedrange: true,
				hoverformat: '.0f',
				showgrid: false,
				showticklabels: false,
			},
			// temperature
			yaxis2: {
				overlaying: 'y',
				autorange: true,
				side: 'right',
				fixedrange: true,
				hoverformat: '.1f',
			},
		};

		// plot configuration
		const config = {
			responsive: true,
			scrollZoom: true,
			displaylogo: false,
			modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoscale2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
		};

		Plotly.react(chart, dataToPlot, layout, config);
		firstLoad = false;
	};

	// get bar type, private
	// returns bar type based on plot type
	const getBarType = (plotType) => {
		// default to 5 minutes (milliseconds) for bar width;
		let width = 5 * 60 * 1000;
		if (metaData.hourly) width *= 12;
		if (metaData.daily) width *= 12 * 24;
		switch (plotType) {
		case 'equip':
			return {
				type: 'bar',
				width,
			};
		default:
			return {
				type: 'scatter',
				mode: 'lines',
			};
		}
	};

	// get axis num, private
	// returns the axis number to plot on based on plot type
	const getAxisNum = (plotType) => {
		switch (plotType) {
		case 'equip':
			return 'y';
		case 'temp':
		default:
			return 'y2';
		}
	};

	// get info, public
	// returns select info about the plot
	const getInfo = (type) => {
		const plot = document.getElementById('chart');
		// can't get anything if the plot isn't drawn
		if (!plot.layout) return null;
		switch (type) {
		// all available data
		case 'xMin':
			return metaData.minTimestamp;
		case 'xMax':
			return metaData.maxTimestamp;

			// visible data
		case 'xMinVisible':
			return DateTime.fromISO(plot.layout.xaxis[0]).toMillis();
		case 'xMaxVisible':
			return DateTime.fromISO(plot.layout.xaxis[1]).toMillis();

			// oldest data
		case 'oldestData':
			return metaData.oldestData;

			// hourly
		case 'hourly':
			return metaData.hourly;
			// daily
		case 'daily':
			return metaData.daily;

		default:
			return null;
		}
	};

	// legend click, private
	// opens the legend editor dialog
	const legendClick = () => {
		// hide everything in the dialog box
		$('.dialog-hidden').hide(0);
		// show only the legend options
		$('#dialog-legend').show(0);

		// build the checkboxes
		const html = seriesInfo.map((series, i) => {
			if (series.type !== 'occup') {
				return $('<div>')
					.append(
						$('<div>', { class: 'legend-color-box', id: `legend-color-box-${i}`, css: { background: colors[i] } }),
					)
					.append(
						$('<input />', { type: 'checkbox', id: `legend-${i}`, value: i }),
					)
					.append(
						$('<label />', { for: `legend-${i}`, text: series.name, id: `legend-label-${i}` }),
					)
					.prop('outerHTML');
			}
			return undefined;
		});

		// put checkboxes in div and make into ui controls
		$('#dialog-legend').html(html.join(''))
			.find('input')
			.checkboxradio();

		// append an update button
		$('#dialog-legend').append(
			$('<input />', {
				type: 'button', id: 'legend-update', value: 'Update', class: 'dialog-right',
			})
				.on('click', legendUpdate)
				.button(),
		);

		// assign checked state
		seriesInfo.forEach((series, i) => {
			$(`#legend-${i}`).prop('checked', visible[i]).checkboxradio('refresh');
		});

		// show the dialog
		$('#dialog').dialog('open').dialog('option', 'title', 'Series selection');
	};

	// legend update, private
	// read through checkboxes on legend display and update visible array
	const legendUpdate = () => {
		$('#dialog-legend input:checkbox').each((i, element) => {
			visible[+element.value] = element.checked;
		});

		// update the plot
		plotData();
		// close the dialog
		$('#dialog').dialog('close');
	};

	// generate table, private
	const generateTable = () => {
		// see if the chart is on the page and the sum button was not pressed
		if ($('#chart').position().left < 0) {
			table.toggleTable(false);
		} else {
			// calculate and show the table
			table.updateTable();
			// table.showTable(data, legends, visible, yaxes);
			$('#tooltip').hide();
		}
	};

	// toggle occupancy, private
	// occupancy on = show series only when occupancy sensor is triggered
	const toggleOccup = () => {
		// redraw plot the called function references the state of the checkbox to show or hide occupancy info
		plotData(buildDataSet(), chart.layout.xaxis.range);
	};

	// public api
	return {
		init,
		getInfo,
		getData,
	};
})();
