// the chart's x axis range: keeping it inside the available data and reading what is visible

import state from '../state.mjs';
import { getBarType } from './style.mjs';
import { convertTimestamp } from '../data/parse.mjs';

const { DateTime } = luxon;

// x bounds
// the available data as [lower, upper] in plotly milliseconds
export const xBounds = () => {
	// pad by half a bar so the bars at either end are not cut off
	const pad = getBarType('equip').width / 2;
	return [convertTimestamp(state.metaData.minTimestamp) - pad, convertTimestamp(state.metaData.maxTimestamp) + pad];
};

// limit x range
// keeps a range (plotly milliseconds) inside the available data, preserving its span where possible
const limitXRange = (min, max) => {
	const [lower, upper] = xBounds();
	const span = Math.min(max - min, upper - lower);
	const newMin = Math.min(Math.max(min, lower), upper - span);
	return [newMin, newMin + span];
};

// keep x in range
// plotly_relayout handler, moves the x axis back inside the available data
// pan and wheel zoom are limited as they happen by xlimit.mjs, this catches everything else such as the range selector buttons
export const keepXInRange = () => {
	const chart = document.getElementById('chart');
	// eslint-disable-next-line no-underscore-dangle -- plotly internals, see xlimit.mjs
	const { xaxis } = chart._fullLayout;
	const [min, max] = xaxis.range.map((value) => xaxis.r2l(value));
	const [newMin, newMax] = limitXRange(min, max);
	// tolerance avoids a relayout loop from rounding when converting to and from range strings
	if (Math.abs(newMin - min) < 1000 && Math.abs(newMax - max) < 1000) return;
	Plotly.relayout(chart, { 'xaxis.range': [xaxis.l2r(newMin), xaxis.l2r(newMax)] });
};

// parse axis date
// plotly reports ranges as 'yyyy-MM-dd HH:mm:ss' after panning or zooming, otherwise they are the iso strings from plotData
const parseAxisDate = (value) => {
	const dt = DateTime.fromSQL(value);
	return dt.isValid ? dt : DateTime.fromISO(value);
};

// visible range
// the chart's visible x range as [min, max] epoch milliseconds, or null if the chart has not been drawn
export const visibleRange = () => {
	const { layout } = document.getElementById('chart');
	if (!layout) return null;
	return layout.xaxis.range.map((value) => parseAxisDate(value).toMillis());
};
