import settings from './settings.mjs';

const config = (() => {
	// local variables
	const { DateTime } = luxon;	// local alias
	let nodebee;	// provided at init

	// adjust end dates, private
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

	// open config dialog, private
	const openConfig = () => {
		let dt = DateTime.fromMillis(nodebee.getInfo('xMin'), { zone: 'UTC' }).startOf('day');
		const oldestData = DateTime.fromMillis(nodebee.getInfo('oldestData'));
		// hide everything in the dialog box
		$('.dialog-hidden').hide(0);
		// show only the config options
		$('#dialog-config').show(0);
		$('#dialog').dialog('open')
			.dialog('option', 'title', 'Date picker');
		$('#startdate').datepicker('setDate', dt.toLocaleString())
			.datepicker('option', 'maxDate', 0)
			.datepicker('option', 'minDate', oldestData.toLocaleString())
			.datepicker('option', 'buttonText', dt.toLocaleString());

		// subtract 1 minute to eliminate "at midnight" calculation errors
		dt = DateTime.fromMillis(nodebee.getInfo('xMax'), { zone: 'UTC' }).plus({ minute: -1 }).endOf('day');
		$('#enddate').datepicker('setDate', dt.toLocaleString())
			.datepicker('option', 'buttonText', dt.toLocaleString());
		adjustEndDates();

		// interval
		let interval = 'minute';
		if (nodebee.getInfo('hourly')) interval = 'hourly';
		if (nodebee.getInfo('daily')) interval = 'daily';
		$(`#interval-${interval}`).prop('checked', true);
		$('input[name=interval]').checkboxradio('refresh');
	};

	// date selected, private
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

	// quick range, public
	// start and end DateTimes for a quick link, calculated from now
	const quickRange = (name) => {
		const now = DateTime.local();
		switch (name) {
			case '24 Hours':
				return { start: now.plus({ hour: -24 }), end: now };
			case 'Yesterday': {
				const start = now.plus({ day: -1 }).startOf('day');
				return { start, end: start.endOf('day') };
			}
			case 'Yesterday + Today':
				return { start: now.plus({ day: -1 }).startOf('day'), end: now };
			case '7 Days':
				return { start: now.plus({ day: -6 }).startOf('day'), end: now.endOf('day') };
			case '30 Days':
				// past 30 days including today
				return { start: now.plus({ day: -29 }).startOf('day'), end: now.endOf('day') };
			case 'Today':
			default:
				return { start: now.startOf('day'), end: now.endOf('day') };
		}
	};

	// update configuration and close dialog
	// quick is the name of a quick link, otherwise the dates are read from the date pickers
	const updateConfig = (quick) => {
		// close the dialog box
		$('#dialog').dialog('close');

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
		nodebee.getData(thermostat, start.toMillis(), end.toMillis(), interval === 'hourly', interval === 'daily');
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

	// initialize function
	const init = (_nodebee) => {
		nodebee = _nodebee;

		// config button
		$('#config-touch').button()
			.on('click', openConfig);

		// general dialog
		$('#dialog').dialog({
			autoOpen: false,
			draggable: true,
			position: {
				my: 'center',
				at: 'center',
				of: '#chart',
			},
			width: 325,
			show: 'slideDown',
			hide: 'slideUp',
			modal: true,
			resizable: false,
		});

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

	// list the thermostats
	const listThermostats = (systemInfo) => {
		// build a new html string
		const html = Object.keys(systemInfo).map((key) => `<option value="${key}">${systemInfo[key].name}</option>`);
		const $list = $('#thermostats');
		$list.html(html.join('')).selectmenu('refresh');
	};

	// set the selected thermostat
	const setThermostat = (thermostat) => {
		$('#thermostats').val(thermostat).selectmenu('refresh');
	};

	// public api
	return {
		init,
		quickRange,
		listThermostats,
		setThermostat,
	};
})();

export default config;
