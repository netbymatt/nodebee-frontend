// the series dialog, turns series on and off

import state from '../state.mjs';
import { saveHidden } from '../utils/settings.mjs';
import { seriesColor } from '../chart/style.mjs';
import { refreshView } from '../view.mjs';
import { openDialog } from './dialog.mjs';

// legend change
// a series was turned on or off, apply it immediately
const legendChange = (e) => {
	state.visible[+e.currentTarget.value] = e.currentTarget.checked;

	// remember which series are turned off
	saveHidden(state.seriesInfo.filter((series, i) => !state.visible[i] && series.type !== 'occup').map((series) => series.name));

	refreshView();
};

// legend click
// opens the legend editor dialog
const legendClick = () => {
	// build the checkboxes, each with a swatch of the color that is plotted
	const $legend = $('#dialog-legend').empty();
	state.seriesInfo.forEach((series, i) => {
		if (series.type === 'occup') return;
		$legend.append($('<div>')
			.append($('<input />', {
				type: 'checkbox', id: `legend-${i}`, value: i, checked: state.visible[i],
			}))
			.append($('<label />', { for: `legend-${i}`, id: `legend-label-${i}` })
				.append($('<span />', { class: 'legend-swatch', css: { background: seriesColor(i) } }))
				.append(document.createTextNode(series.name))));
	});

	// make into ui controls
	$legend.find('input')
		.checkboxradio()
		.on('change', legendChange);

	openDialog('dialog-legend', 'Series');
};

const initLegend = () => {
	$('#legend-touch').button()
		.on('click', legendClick);
};

export default initLegend;
