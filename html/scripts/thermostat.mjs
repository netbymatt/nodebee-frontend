// v1.1
import config from './config.mjs';
import table from './table.mjs';
import enableXLimits from './xlimit.mjs';
import enablePinchZoom from './pinchzoom.mjs';
import settings from './settings.mjs';

// plotly's default colors, assigned to series without a fixed color by their position when every series is shown
// so a series keeps its color when others are hidden
const COLORWAY = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

const nodebee = (() => {
	const { DateTime } = luxon;	// alias object
	let activeThermostat;
	let data = []; // data to plot
	const metaData = { // metadata
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
	let zoomOnFirstLoad = true;	// show only yesterday and today on the first load unless a range was remembered
	let loadingCount = 0;	// requests in progress

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

	// skip some data, private
	// skips some data points based on how many can be drawn in in the visible area
	const filterOccupancy = (myData, name) => {
		// check if dataset has occupancy info
		const occupPresent = seriesInfo.findIndex((element) => element.name === `${name} occupancy`);
		// if no occupancy info return immediately, occupancy is not available for hourly and daily data
		if (occupPresent === -1 || !data[occupPresent]) return myData;
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

	// series style, private
	// the color for the series at index i of seriesInfo, either a fixed color or one from the colorway
	const seriesStyle = (i) => {
		const series = seriesInfo[i];
		const fixed = colorByLegend(series.name);
		if (fixed) return fixed;
		const position = seriesInfo.slice(0, i).filter((s) => s.type !== 'occup').length;
		return { line: { color: COLORWAY[position % COLORWAY.length] } };
	};

	// series color, private
	// the color that is plotted for the series at index i of seriesInfo
	const seriesColor = (i) => {
		const style = seriesStyle(i);
		return (style.marker ?? style.line).color;
	};

	// hover template, private
	// shows each value with its units, equipment is minutes of runtime per interval or hours per day
	const hoverTemplate = (type) => {
		if (type === 'equip') return `%{fullData.name}: %{y} ${metaData.daily ? 'h' : 'min'}<extra></extra>`;
		return '%{fullData.name}: %{y:.1f} °F<extra></extra>';
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

	// build data set, private
	// takes global data and returns an object formatted for plotly
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
				hovertemplate: hoverTemplate(series.type),
				...getBarType(series.type),
				...seriesStyle(i),
			};
			// filter for data that is visible
		});
		return set.filter((d) => d);
	};

	// build table data, private
	// the same series as the chart, with the type for formatting
	const buildTableData = () => data.map((values, i) => {
		const series = seriesInfo[i];
		if (!visible[i] || series.type === 'occup') return false;
		return {
			name: series.name,
			type: series.type,
			...filterOccupancy(values, series.name),
		};
	}).filter((d) => d);

	// x bounds, private
	// the available data as [lower, upper] in plotly milliseconds
	const xBounds = () => {
		// pad by half a bar so the bars at either end are not cut off
		const pad = getBarType('equip').width / 2;
		return [convertTimestamp(metaData.minTimestamp) - pad, convertTimestamp(metaData.maxTimestamp) + pad];
	};

	// limit x range, private
	// keeps a range (plotly milliseconds) inside the available data, preserving its span where possible
	const limitXRange = (min, max) => {
		const [lower, upper] = xBounds();
		const span = Math.min(max - min, upper - lower);
		const newMin = Math.min(Math.max(min, lower), upper - span);
		return [newMin, newMin + span];
	};

	// keep x in range, private
	// plotly_relayout handler, moves the x axis back inside the available data
	// pan and wheel zoom are limited as they happen by xlimit.mjs, this catches everything else such as the range selector buttons
	const keepXInRange = () => {
		const chart = document.getElementById('chart');
		// eslint-disable-next-line no-underscore-dangle -- plotly internals, see xlimit.mjs
		const { xaxis } = chart._fullLayout;
		const [min, max] = xaxis.range.map((value) => xaxis.r2l(value));
		const [newMin, newMax] = limitXRange(min, max);
		// tolerance avoids a relayout loop from rounding when converting to and from range strings
		if (Math.abs(newMin - min) < 1000 && Math.abs(newMax - max) < 1000) return;
		Plotly.relayout(chart, { 'xaxis.range': [xaxis.l2r(newMin), xaxis.l2r(newMax)] });
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
		if (firstLoad && zoomOnFirstLoad) {
			rangeXMin = DateTime.local().minus({ days: 1 }).startOf('day').toISO();
		}

		// configure the layout
		const layout = {
			title: { text: systemInfo[activeThermostat].name },
			showlegend: false,
			barmode: 'overlay',
			// one hover label with every value at that time
			hovermode: 'x unified',
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
				// keep independent ticks instead of syncing to the hidden equipment axis
				tickmode: 'auto',
				autorange: true,
				side: 'right',
				fixedrange: true,
				hoverformat: '.1f',
			},
		};

		// plot configuration
		const plotConfig = {
			responsive: true,
			scrollZoom: true,
			// pan, scroll and pinch cover zooming so the toolbar isn't needed, it also covered the title on phones
			displayModeBar: false,
		};

		Plotly.react(chart, dataToPlot, layout, plotConfig);
		if (firstLoad) {
			chart.on('plotly_relayout', keepXInRange);
			enableXLimits(chart, xBounds);
		}
		firstLoad = false;
	};

	// show error, private
	const showError = (message) => {
		// hide everything in the dialog box
		$('.dialog-hidden').hide(0);
		// show only the error div
		$('#dialog-error').text(message).show(0);
		// show the dialog
		$('#dialog').dialog('open').dialog('option', 'title', 'Error');
	};

	// set loading, private
	// shows the loading indicator while any request is in progress
	const setLoading = (loading) => {
		loadingCount += loading ? 1 : -1;
		$('#loading').toggleClass('active', loadingCount > 0);
	};

	// format data, private
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

		// clear out old data, visible is maintained
		data = [];

		// parse the data
		seriesInfo = makeSeriesInfo(systemInfo);
		const rawData = {
			thermostat: expandTimestamps(thermostatData.data, 0),
			sensor: expandTimestamps(sensorData.data, 0),
			thermostatColumns: thermostatData.columnNames,
			sensorColumns: sensorData.columnNames,
		};

		// set up visibility for first run if necessary, restoring any series that were turned off on a previous visit
		const hidden = settings.load().hidden ?? [];
		visible = seriesInfo.map((series, i) => ((firstLoad || visible[i] === undefined) ? !hidden.includes(series.name) : visible[i]));

		// extract the plot options
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
		table.updateTable(buildTableData());
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
		setLoading(true);
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

	// get system info
	const getSystem = async () => {
		setLoading(true);
		try {
			const system = await $.ajax({
				url: 'system',
				type: 'GET',
				dataType: 'json',
				contentType: 'application/json',
			});
			systemInfo = readSystemInfo(system);

			// use the remembered thermostat, range and interval, defaulting to the first thermostat and the server's default range
			const saved = settings.load();
			const thermostat = systemInfo[saved.thermostat] ? saved.thermostat : Object.keys(systemInfo)[0];
			let start;
			let end;
			if (saved.range?.quick) {
				const range = config.quickRange(saved.range.quick);
				start = range.start.toMillis();
				end = range.end.toMillis();
			} else if (saved.range) {
				({ start, end } = saved.range);
			}
			getData(thermostat, start, end, saved.interval === 'hourly', saved.interval === 'daily');
			config.listThermostats(systemInfo);
			config.setThermostat(thermostat);
		} catch (e) {
			console.error(e);
			showError('Unable to load the list of thermostats from the server.');
		} finally {
			setLoading(false);
		}
	};

	// legend change, private
	// a series was turned on or off in the legend dialog, apply it immediately
	const legendChange = (e) => {
		visible[+e.currentTarget.value] = e.currentTarget.checked;

		// remember which series are turned off
		settings.save({ hidden: seriesInfo.filter((series, i) => !visible[i] && series.type !== 'occup').map((series) => series.name) });

		// update the plot, keeping the current x range
		plotData(buildDataSet(), document.getElementById('chart').layout.xaxis.range);
		table.updateTable(buildTableData());
	};

	// legend click, private
	// opens the legend editor dialog
	const legendClick = () => {
		// hide everything in the dialog box
		$('.dialog-hidden').hide(0);

		// build the checkboxes, each with a swatch of the color that is plotted
		const $legend = $('#dialog-legend').empty();
		seriesInfo.forEach((series, i) => {
			if (series.type === 'occup') return;
			$legend.append($('<div>')
				.append($('<input />', {
					type: 'checkbox', id: `legend-${i}`, value: i, checked: visible[i],
				}))
				.append($('<label />', { for: `legend-${i}`, id: `legend-label-${i}` })
					.append($('<span />', { class: 'legend-swatch', css: { background: seriesColor(i) } }))
					.append(document.createTextNode(series.name))));
		});

		// make into ui controls
		$legend.find('input')
			.checkboxradio()
			.on('change', legendChange);

		// show only the legend options
		$legend.show(0);

		// show the dialog
		$('#dialog').dialog('open').dialog('option', 'title', 'Series');
	};

	// generate table, private
	const generateTable = () => {
		// switch back to the chart if the table is showing
		if ($('#chart').position().left < 0) {
			table.toggleTable(false);
		} else {
			// calculate and show the table
			table.showTable(buildTableData());
		}
	};

	// toggle occupancy, private
	// occupancy on = show series only when occupancy sensor is triggered
	const toggleOccup = () => {
		settings.save({ occupancy: $('#occup-touch').is(':checked') });
		// redraw plot the called function references the state of the checkbox to show or hide occupancy info
		plotData(buildDataSet(), document.getElementById('chart').layout.xaxis.range);
		table.updateTable(buildTableData());
	};

	// init, pubic
	const init = () => {
		// a remembered range is shown in full instead of zooming to yesterday and today
		const saved = settings.load();
		zoomOnFirstLoad = !saved.range;

		getSystem();
		enablePinchZoom(document.getElementById('chart'));

		// legend button
		$('#legend-touch').button()
			.on('click', legendClick);
		// table button
		$('#table-touch').button()
			.on('click', generateTable);

		// occupancy button, a toggle button without the checkbox icon
		$('#occup-touch').prop('checked', !!saved.occupancy)
			.checkboxradio({ icon: false })
			.on('change', toggleOccup);
	};

	// parse axis date, private
	// plotly reports ranges as 'yyyy-MM-dd HH:mm:ss' after panning or zooming, otherwise they are the iso strings from plotData
	const parseAxisDate = (value) => {
		const dt = DateTime.fromSQL(value);
		return dt.isValid ? dt : DateTime.fromISO(value);
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
				return parseAxisDate(plot.layout.xaxis.range[0]).toMillis();
			case 'xMaxVisible':
				return parseAxisDate(plot.layout.xaxis.range[1]).toMillis();

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
	// public api
	return {
		init,
		getInfo,
		getData,
	};
})();

// launch
// config and table are initialized first and given access to nodebee
$(() => {
	config.init(nodebee);
	table.init(nodebee);
	nodebee.init();
});

export default nodebee;
