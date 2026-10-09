// state shared between the modules

const state = {
	activeThermostat: undefined,
	data: [],	// data to plot, { x: [], y: [] } for each series in seriesInfo (false when not available)
	metaData: {
		minTimestamp: null,
		maxTimestamp: null,
		hourly: false,
		daily: false,
		oldestData: null,
	},
	systemInfo: {},	// thermostats and their sensors
	seriesInfo: [],	// information about each series to plot
	visible: [],	// show this series
	firstLoad: true,
	zoomOnFirstLoad: true,	// show only yesterday and today on the first load unless a range was remembered
	occupancyOnly: false,	// only show room temperatures while the room is occupied
};

export default state;
