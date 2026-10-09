// the table and occupancy buttons

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

const initToolbar = () => {
	$('#table-touch').button()
		.on('click', tableClick);

	// a toggle button without the checkbox icon
	$('#occup-touch').checkboxradio({ icon: false })
		.on('change', occupancyChange);
};

export default initToolbar;
