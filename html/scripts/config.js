// launch
$(() => {
	config.init();
});

/* globals luxon, nodebee */

const config = (() => {
	// local variables
	const { DateTime } = luxon;	// local alias

	// initialize function
	const init = () => {
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

		// hourly, daily checkbox
		$('.dialog-right input').checkboxradio()
			.on('click', exclusiveGrouping);

		// update button
		$('#config-update').button()
			.on('click', updateConfig);

		// fixed time selector buttons
		$('.config-fixed-time').button()
			.on('click', fixedTimeSelect);

		// list of thermostats
		$('#thermostats').selectmenu();
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

		// checkboxes
		$('#checkbox-daily').prop('checked', nodebee.getInfo('daily')).button('refresh');
		$('#checkbox-hourly').prop('checked', nodebee.getInfo('hourly')).button('refresh');
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
		default:
			// adjust to beginning of day
			inst.input.datepicker('setDate', dt.startOf('day').toLocaleString());
			// fix limits on end date
			adjustEndDates();
			break;

		case 'enddate':
			// adjust to end of day
			inst.input.datepicker('setDate', dt.endOf('day').toLocaleString());

			// end date does not enforce limits on start date so any date can be chosen
			// the limit provided in metadata does apply, however and is set at init

			break;
		}
	};

	// update configuration and close dialog
	const updateConfig = (flag24Hours) => {
		// close the dialog box
		$('#dialog').dialog('close');

		// grab hourly and daily checkboxes
		const hourly = $('#checkbox-hourly').prop('checked');
		const daily = $('#checkbox-daily').prop('checked');

		// determine type
		// get selected date and time, shift to begining and end of day
		let startDate = DateTime.fromJSDate($('#startdate').datepicker('getDate')).startOf('day');
		let endDate = DateTime.fromJSDate($('#enddate').datepicker('getDate')).endOf('day');
		// special case for 24 hours since the date time picker only holds dates (not times)
		if (flag24Hours === true) {
			// calculate previous 24 hours from now
			startDate = DateTime.local().plus({ hour: -24 });
			endDate = DateTime.local();
		}
		// request is made in seconds since epoch, maximum duration of 7 days is checked by php script
		nodebee.getData($('#thermostats').val(), Math.floor(startDate.valueOf()), Math.floor(endDate.valueOf()), hourly, daily);
	};

	// fixed time select
	const fixedTimeSelect = (e) => {
		const obj = $(e.currentTarget);
		const now = DateTime.local();
		let startDate;
		let endDate;
		let flag24Hours = false;

		// calculate start and end points
		switch (obj.val()) {
		default:
		case 'Today':
			startDate = now.startOf('day');
			endDate = now.endOf('day');
			break;
		case '24 Hours':
			startDate = now.plus({ hour: -24 });
			endDate = now;
			flag24Hours = true; // date time picker objects only hold dates, not times
			break;
		case 'Yesterday':
			startDate = now.plus({ day: -1 }).startOf('day');
			endDate = startDate.endOf('day');
			break;
		case 'Yesterday + Today':
			startDate = now.plus({ day: -1 }).startOf('day');
			endDate = now;
			break;
		case 'This Week':
			endDate = now.endOf('day');
			startDate = now.plus({ day: -6 }).startOf('day');
			break;
		}

		// update date picker
		$('#startdate').datepicker('setDate', startDate.toLocaleString());
		$('#enddate').datepicker('setDate', endDate.toLocaleString());
		adjustEndDates();
		// for convenience, call the update button (closes dialog)
		updateConfig(flag24Hours);
	};

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

	// exclusive grouping, private
	// ensure that hourly and daily are not both checked at the same time
	const exclusiveGrouping = (e) => {
		let otherCheckbox;
		// see if this is checked
		if ($(e.currentTarget).prop('checked')) {
			// uncheck the other value
			switch ($(e.currentTarget).val()) {
			case 'daily':
				otherCheckbox = $('#checkbox-hourly');
				break;
			case 'hourly':
			default:
				otherCheckbox = $('#checkbox-daily');
			}
			otherCheckbox.prop('checked', false).button('refresh');
		}
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
		listThermostats,
		setThermostat,
	};
})();
