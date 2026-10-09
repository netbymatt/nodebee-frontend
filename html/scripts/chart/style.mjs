// colors, hover text and trace types for each series

import state from '../state.mjs';

// plotly's default colors, assigned to series without a fixed color by their position when every series is shown
// so a series keeps its color when others are hidden
const COLORWAY = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

// get axis num
// returns the axis number to plot on based on plot type
export const getAxisNum = (plotType) => {
	switch (plotType) {
		case 'equip':
			return 'y';
		case 'temp':
		default:
			return 'y2';
	}
};

// color by legend
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

// series style
// the color for the series at index i of seriesInfo, either a fixed color or one from the colorway
export const seriesStyle = (i) => {
	const series = state.seriesInfo[i];
	const fixed = colorByLegend(series.name);
	if (fixed) return fixed;
	const position = state.seriesInfo.slice(0, i).filter((s) => s.type !== 'occup').length;
	return { line: { color: COLORWAY[position % COLORWAY.length] } };
};

// series color
// the color that is plotted for the series at index i of seriesInfo
export const seriesColor = (i) => {
	const style = seriesStyle(i);
	return (style.marker ?? style.line).color;
};

// hover template
// shows each value with its units, equipment is minutes of runtime per interval or hours per day
export const hoverTemplate = (type) => {
	if (type === 'equip') return `%{fullData.name}: %{y} ${state.metaData.daily ? 'h' : 'min'}<extra></extra>`;
	return '%{fullData.name}: %{y:.1f} °F<extra></extra>';
};

// get bar type
// returns bar type based on plot type
export const getBarType = (plotType) => {
	// default to 5 minutes (milliseconds) for bar width;
	let width = 5 * 60 * 1000;
	if (state.metaData.hourly) width *= 12;
	if (state.metaData.daily) width *= 12 * 24;
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
