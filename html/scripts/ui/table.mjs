// the data table, an alternative to the chart

import { visibleRange } from '../chart/xrange.mjs';

const { DateTime } = luxon;

// escape html
// series names come from the database
const escapeHtml = (text) => `${text}`.replace(/[&<>"']/g, (char) => ({
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
})[char]);

// format data
// format "temperature" data to one decimal place
const formatData = (_data, type) => {
	// turn null data into blank
	let data = _data ?? '';
	if (type === 'temp' && data !== '' && (`${data}`).indexOf('.') === -1) {
		data += '.0';
	}

	return data;
};

// table range
// the chart's visible x range in the same "local time as utc" milliseconds as the series timestamps
// returns null if the chart has not been drawn
const tableRange = () => visibleRange()?.map((ms) => DateTime.fromMillis(ms).setZone('UTC', { keepLocalTime: true }).toMillis()) ?? null;

// merge series
// series each have their own timestamps, combine them into one row per timestamp, newest first
const mergeSeries = (series) => {
	const rows = new Map();
	series.forEach((s, col) => {
		s.x.forEach((x, i) => {
			if (s.y[i] === null || s.y[i] === undefined) return;
			if (!rows.has(x)) rows.set(x, new Array(series.length).fill(null));
			rows.get(x)[col] = s.y[i];
		});
	});

	// limit to the visible range of the chart
	const range = tableRange();
	const timestamps = [...rows.keys()].filter((x) => {
		if (!range) return true;
		const ms = Date.parse(x);
		return ms >= range[0] && ms <= range[1];
	});

	// iso timestamps sort correctly as strings
	timestamps.sort().reverse();
	return timestamps.map((x) => ({ x, values: rows.get(x) }));
};

// build table
// series is an array of { name, type, x: [], y: [] }
const buildTable = (series) => {
	const header = `<tr><th>Timestamp</th>${series.map((s) => `<th>${escapeHtml(s.name)}</th>`).join('')}</tr>`;
	const rows = mergeSeries(series);

	// store the date for table formatting
	let lastDay = 0;

	const body = rows.map(({ x, values }) => {
		// timestamps are local time stored as utc
		const dt = DateTime.fromISO(x, { zone: 'UTC' });
		const classes = [];
		if (dt.day !== lastDay) classes.push('data-table-new-day');
		if (dt.hour % 2 === 1) classes.push('data-table-odd-hour');
		lastDay = dt.day;

		// timestamp on one line (Fri 10/09  5:20pm), the time is padded so the columns line up in the monospace font
		const timestamp = `<th scope="row">${dt.toFormat('ccc LL/dd')} ${dt.toFormat('h:mma').toLowerCase().padStart(7)}</th>`;
		const cells = values.map((value, col) => `<td>${formatData(value, series[col].type)}</td>`).join('');

		const rowClass = classes.length ? ` class="${classes.join(' ')}"` : '';
		return `<tr${rowClass}>${timestamp}${cells}</tr>`;
	});

	if (body.length === 0) body.push(`<tr><td colspan="${series.length + 1}">No data in the visible range</td></tr>`);

	return `<table class="data-table"><thead>${header}</thead><tbody>${body.join('')}</tbody><tfoot>${header}</tfoot></table>`;
};

// toggle table
// show the table (true) or chart
export const toggleTable = (show) => {
	// calc safe off screen position
	const offscreen = -$('#chart').width() * 10;
	if (show) {
		$('#table').css({ left: 0 });
		$('#chart').css({ left: offscreen });
		$('#table-touch').attr({ title: 'Show chart', 'aria-label': 'Show chart' })
			.children().eq(0)
			.addClass('fa-chart-line')
			.removeClass('fa-table');
		$('#legend-touch').hide(0);
	} else {
		$('#table').css({ left: offscreen });
		$('#chart').css({ left: 0 });
		$('#table-touch').attr({ title: 'Show table', 'aria-label': 'Show table' })
			.children().eq(0)
			.addClass('fa-table')
			.removeClass('fa-chart-line');
		$('#legend-touch').show(0);
	}
};

// select table
// selects all text in table body for easy copying
const selectTable = () => {
	const body = document.querySelector('.data-table > tbody');
	const range = document.createRange();
	range.selectNodeContents(body);
	const selection = window.getSelection();
	selection.removeAllRanges();
	selection.addRange(range);
};

// show table
export const showTable = (series) => {
	// put table on page
	$('#table').html(buildTable(series));

	// add double click handler
	$('.data-table').on('dblclick', selectTable);

	// show the table
	toggleTable(true);
};

// is showing
// returns true if the table is showing
export const isShowing = () => $('#table').position().left >= 0;

// update table
// updates the table if it is showing
export const updateTable = (series) => {
	if (isShowing()) {
		showTable(series);
	}
};
