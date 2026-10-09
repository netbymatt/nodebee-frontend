// start the app

import state from './state.mjs';
import settings from './utils/settings.mjs';
import { getSystem } from './data/load.mjs';
import enablePinchZoom from './chart/pinchzoom.mjs';
import { initDialog } from './ui/dialog.mjs';
import initDatePicker from './ui/datepicker.mjs';
import initLegend from './ui/legend.mjs';
import initToolbar from './ui/toolbar.mjs';

$(() => {
	// a remembered range is shown in full instead of zooming to yesterday and today
	state.zoomOnFirstLoad = !settings.load().range;

	initDialog();
	initDatePicker();
	initLegend();
	initToolbar();
	enablePinchZoom(document.getElementById('chart'));

	getSystem();
});
