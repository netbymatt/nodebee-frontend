// start the app

import { getSystem } from './data/load.mjs';
import enablePinchZoom from './chart/pinchzoom.mjs';
import { initDialog } from './ui/dialog.mjs';
import initDatePicker from './ui/datepicker.mjs';
import initLegend from './ui/legend.mjs';
import initToolbar from './ui/toolbar.mjs';

$(() => {
	initDialog();
	initDatePicker();
	initLegend();
	initToolbar();
	enablePinchZoom(document.getElementById('chart'));

	getSystem();
});
