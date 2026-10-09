// the date picker dialog: date range, interval, thermostat and quick links

import state from '../state.mjs';
import settings from '../utils/settings.mjs';
import { getData } from '../data/load.mjs';
import { closeDialog, openDialog } from './dialog.mjs';
import quickRange from './quickrange.mjs';

const { DateTime } = luxon;

// adjust end dates
// change the end date and limits if it falls outside the rules below
const adjustEndDates = () => {
	// get the selected start date
	const dt = DateTime.fromJSDate($('#startdate').datepicker('getDate'), 'M/d/yyyy', { zone: 'UTC' });

	// set earliest selectable date to the selected start date
	$('#enddate').datepicker('option', 'minDate', dt.toLocaleString());
	// test for end date that is earlier than the selected start date
	const selectedEnd = DateTime.fromJSDate($('#enddate').datepicker('getDate')).endOf('day');
	// adjust if necessary
	if (selectedEnd < dt) {
		$('#enddate').datepicker('setDate', dt.endOf('day').toLocaleString())
			.datepicker('option', 'buttonText', dt.endOf('day').toLocaleString());
	}

	// calculate the maximum valid end date
	let maxDate = dt.plus({ month: 1 }).endOf('day');
	// max date can't be greater than today
	if (maxDate > DateTime.local()) {
		maxDate = DateTime.local().endOf('day');
	}
	$('#enddate').datepicker('option', 'maxDate', maxDate.toLocaleString());

	// test currently selected date past limit
	if (selectedEnd > maxDate) {
		$('#enddate').datepicker('setDate', maxDate.toLocaleString())
			.datepicker('option', 'buttonText', maxDate.toLocaleString());
	}
};

// open config dialog
const openConfig = () => {
	const { metaData } = state;
	let dt = DateTime.fromMillis(metaData.minTimestamp, { zone: 'UTC' }).startOf('day');
	const oldestData = DateTime.fromMillis(metaData.oldestData);
	openDialog('dialog-config', 'Date picker');
	$('#startdate').datepicker('setDate', dt.toLocaleString())
		.datepicker('option', 'maxDate', 0)
		.datepicker('option', 'minDate', oldestData.toLocaleString())
		.datepicker('option', 'buttonText', dt.toLocaleString());

	// subtract 1 minute to eliminate "at midnight" calculation errors
	dt = DateTime.fromMillis(metaData.maxTimestamp, { zone: 'UTC' }).plus({ minute: -1 }).endOf('day');
	$('#enddate').datepicker('setDate', dt.toLocaleString())
		.datepicker('option', 'buttonText', dt.toLocaleString());
	adjustEndDates();

	// interval
	let interval = 'minute';
	if (metaData.hourly) interval = 'hourly';
	if (metaData.daily) interval = 'daily';
	$(`#interval-${interval}`).prop('checked', true);
	$('input[name=interval]').checkboxradio('refresh');
};

// date selected
// update the display of the date on the date picker
// calculate limits for the "other" datepicker
const dateSelected = (dateString, inst) => {
	inst.input.datepicker('option', 'buttonText', dateString);
	// grab selected date
	const dt = DateTime.fromJSDate(inst.input.datepicker('getDate'));
	// determine which date picker was clicked
	switch (inst.id) {
		case 'startdate':
		case 'enddate':
			// adjust to end of day
			inst.input.datepicker('setDate', dt.endOf('day').toLocaleString());

			// end date does not enforce limits on start date so any date can be chosen
			// the limit provided in metadata does apply, however and is set at init

			break;
		default:
			// adjust to beginning of day
			inst.input.datepicker('setDate', dt.startOf('day').toLocaleString());
			// fix limits on end date
			adjustEndDates();
			break;
	}
};

// update configuration and close dialog
// quick is the name of a quick link, otherwise the dates are read from the date pickers
const updateConfig = (quick) => {
	closeDialog();

	const interval = $('input[name=interval]:checked').val() ?? 'minute';

	// get selected date and time, shift to begining and end of day
	// quick links are calculated directly since the date pickers only hold dates (not times)
	const { start, end } = typeof quick === 'string'
		? quickRange(quick)
		: {
			start: DateTime.fromJSDate($('#startdate').datepicker('getDate')).startOf('day'),
			end: DateTime.fromJSDate($('#enddate').datepicker('getDate')).endOf('day'),
		};
	const thermostat = $('#thermostats').val();

	// remember the choices, quick links are stored by name so they are recalculated on the next visit
	settings.save({
		thermostat,
		interval,
		range: typeof quick === 'string' ? { quick } : { start: start.toMillis(), end: end.toMillis() },
	});

	// request is made in milliseconds since epoch, the maximum duration is checked by the server
	getData(thermostat, start.toMillis(), end.toMillis(), interval === 'hourly', interval === 'daily');
};

// fixed time select
const fixedTimeSelect = (e) => {
	const name = $(e.currentTarget).val();
	const { start, end } = quickRange(name);

	// update date picker
	$('#startdate').datepicker('setDate', start.toLocaleString());
	$('#enddate').datepicker('setDate', end.toLocaleString());
	adjustEndDates();
	// for convenience, call the update button (closes dialog)
	updateConfig(name);
};

// initialize
const initDatePicker = () => {
	// config button
	$('#config-touch').button()
		.on('click', openConfig);

	// start date, end date
	$('input[type=input]').datepicker({
		changeMonth: true,
		changeYear: true,
		showButtonPanel: true,
		dateFormat: 'm/d/yy',
		goToCurrent: true,
		showOn: 'button',
		buttonText: 'Date',
		onSelect: dateSelected,
	});

	// 5 minute, hourly, daily
	$('input[name=interval]').checkboxradio();

	// update button
	$('#config-update').button()
		.on('click', () => updateConfig());

	// fixed time selector buttons
	$('.config-fixed-time').button()
		.on('click', fixedTimeSelect);

	// list of thermostats
	$('#thermostats').selectmenu();
};

export default initDatePicker;
