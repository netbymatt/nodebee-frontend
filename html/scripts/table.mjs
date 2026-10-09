const table = (() => {
	const { DateTime } = luxon;	// alias object
	let nodebee;	// provided at init

	// initialize, public
	const init = (_nodebee) => {
		nodebee = _nodebee;
	};

	// escape html, private
	// series names come from the database
	const escapeHtml = (text) => `${text}`.replace(/[&<>"']/g, (char) => ({
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;',
	})[char]);

	// format data, private
	// format "temperature" data to one decimal place
	const formatData = (_data, type) => {
		// turn null data into blank
		let data = _data ?? '';
		if (type === 'temp' && data !== '' && (`${data}`).indexOf('.') === -1) {
			data += '.0';
		}

		return data;
	};

	// visible range, private
	// the chart's visible x range in the same "local time as utc" milliseconds as the series timestamps
	// returns null if the chart has not been drawn
	const visibleRange = () => {
		const min = nodebee.getInfo('xMinVisible');
		const max = nodebee.getInfo('xMaxVisible');
		if (min === null || max === null) return null;
		return [min, max].map((ms) => DateTime.fromMillis(ms).setZone('UTC', { keepLocalTime: true }).toMillis());
	};

	// merge series, private
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
		const range = visibleRange();
		const timestamps = [...rows.keys()].filter((x) => {
			if (!range) return true;
			const ms = Date.parse(x);
			return ms >= range[0] && ms <= range[1];
		});

		// iso timestamps sort correctly as strings
		timestamps.sort().reverse();
		return timestamps.map((x) => ({ x, values: rows.get(x) }));
	};

	// build table, private
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

			// timestamp (day of week, day, hour:minute)
			const timestamp = `<td><table><tr><td>${dt.toLocaleString({ weekday: 'short' })}</td>`
				+ `<td>${dt.toLocaleString({ month: 'short', day: '2-digit' })}</td>`
				+ `<td>${dt.toLocaleString(DateTime.TIME_SIMPLE)}</td></tr></table></td>`;
			const cells = values.map((value, col) => `<td>${formatData(value, series[col].type)}</td>`).join('');

			const rowClass = classes.length ? ` class="${classes.join(' ')}"` : '';
			return `<tr${rowClass}>${timestamp}${cells}</tr>`;
		});

		if (body.length === 0) body.push(`<tr><td colspan="${series.length + 1}">No data in the visible range</td></tr>`);

		return `<table class="data-table"><thead>${header}</thead><tbody>${body.join('')}</tbody><tfoot>${header}</tfoot></table>`;
	};

	// toggle table, public
	// show the table (true) or chart
	const toggleTable = (show) => {
		// calc safe off screen position
		const offscreen = -$('#chart').width() * 10;
		if (show) {
			$('#table').css({ left: 0 });
			$('#chart').css({ left: offscreen });
			$('#table-touch').children().eq(0).addClass('fa-chart-line')
				.removeClass('fa-table');
			$('#legend-touch').hide(0);
		} else {
			$('#table').css({ left: offscreen });
			$('#chart').css({ left: 0 });
			$('#table-touch').children().eq(0).addClass('fa-table')
				.removeClass('fa-chart-line');
			$('#legend-touch').show(0);
		}
	};

	// jquery plugin for selecting text
	jQuery.fn.selText = function selText() {
		const obj = this[0];
		const selection = obj.ownerDocument.defaultView.getSelection();
		const range = obj.ownerDocument.createRange();
		range.selectNodeContents(obj);
		selection.removeAllRanges();
		selection.addRange(range);
		return this;
	};

	// select table, private
	// selects all text in table body for easy copying
	const selectTable = () => {
		$('.data-table > tbody').selText();
	};

	// show table, public
	const showTable = (series) => {
		// put table on page
		$('#table').html(buildTable(series));

		// add double click handler
		$('.data-table').on('dblclick', selectTable);

		// show the table
		toggleTable(true);
	};

	// is showing, public
	// returns true if the table is showing
	const isShowing = () => $('#table').position().left >= 0;

	// update table, public
	// updates the table if it is showing
	const updateTable = (series) => {
		if (isShowing()) {
			showTable(series);
		}
	};

	return {
		init,
		showTable,
		toggleTable,
		isShowing,
		updateTable,
	};
})();

export default table;
