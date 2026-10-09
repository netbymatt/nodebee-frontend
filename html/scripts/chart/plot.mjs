// draw the chart with plotly

import state from '../state.mjs';
import { filterOccupancy } from '../data/series.mjs';
import {
	getAxisNum, getBarType, hoverTemplate, seriesStyle,
} from './style.mjs';
import { keepXInRange, xBounds } from './xrange.mjs';
import enableXLimits from './xlimit.mjs';

const { DateTime } = luxon;

// build data set
// takes the series data and returns traces formatted for plotly
export const buildDataSet = () => {
	const set = state.data.map((values, i) => {
		// grab the series
		const series = state.seriesInfo[i];
		// only plot if visible is set, and not occupancy
		if (!state.visible[i] || series.type === 'occup') return false;
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
	});
	return set.filter((d) => d);
};

// plot data
// xRange is the x axis range to show, otherwise all of the data is shown
export const plotData = (dataToPlot, xRange) => {
	const { metaData } = state;
	// y axis max is based on the plot type
	let yAxisMax = 5;	// default, 5 minutes
	if (metaData.hourly) yAxisMax = 60; // minutes
	if (metaData.daily) yAxisMax = 24; // hours

	// get the chart
	const chart = document.getElementById('chart');

	// determine range of data to plot
	let rangeXMin = xRange?.[0] ?? DateTime.fromMillis(metaData.minTimestamp).toISO();
	const rangeXMax = xRange?.[1] ?? DateTime.fromMillis(metaData.maxTimestamp).toISO();
	if (state.firstLoad && state.zoomOnFirstLoad) {
		rangeXMin = DateTime.local().minus({ days: 1 }).startOf('day').toISO();
	}

	// configure the layout
	const layout = {
		title: { text: state.systemInfo[state.activeThermostat].name },
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
	if (state.firstLoad) {
		chart.on('plotly_relayout', keepXInRange);
		enableXLimits(chart, xBounds);
	}
	state.firstLoad = false;
};
