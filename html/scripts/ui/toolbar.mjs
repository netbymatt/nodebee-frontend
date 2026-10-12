// the table, occupancy and hover buttons

import state from '../state.mjs';
import { buildTableData } from '../data/series.mjs';
import { refreshView } from '../view.mjs';
import { showTable, toggleTable } from './table.mjs';

// table button
// switch between the chart and table
const tableClick = () => {
	if ($('#chart').position().left < 0) {
		toggleTable(false);
	} else {
		showTable(buildTableData());
	}
};

// occupancy button
// occupancy on = show room temperatures only when the room's occupancy sensor is triggered
const occupancyChange = (e) => {
	state.occupancyOnly = e.currentTarget.checked;
	refreshView();
};

// hover button
// turn the hover label on and off without redrawing the data
const hoverChange = (e) => {
	state.hoverValues = e.currentTarget.checked;
	// before the chart is drawn the setting is picked up by plotData
	if (!document.getElementById('chart').layout) return;
	Plotly.relayout('chart', { hovermode: state.hoverValues ? 'x unified' : false });
};

const initToolbar = () => {
	$('#table-touch').button()
		.on('click', tableClick);

	// a toggle button without the checkbox icon
	$('#occup-touch').checkboxradio({ icon: false })
		.on('change', occupancyChange);

	// with a mouse the hover label follows the pointer everywhere so it starts off and can be turned on
	// touch screens only show it when tapping the chart so it is always on and there is no button
	const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
	state.hoverValues = !hasMouse;
	$('#hover-touch').checkboxradio({ icon: false })
		.on('change', hoverChange);
	$('label[for=hover-touch]').toggle(hasMouse);
};

export default initToolbar;
