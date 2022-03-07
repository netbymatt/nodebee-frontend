/* globals luxon, nodebee */
// launch
document.addEventListener('DOMContentLoaded', () => table.init());

const table = (() => {
	const { DateTime } = luxon;	// alias object

	// initialize, public
	const init = () => {
		// calc (sum) button
		$('#calc-touch').hide(0);
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

	const showTable = (data, legends, visible, types) => {
		// pass table building to the appropriate function
		const tableHTML = buildFullTable(data, legends, visible, types);

		// put table on page
		$('#table').html(tableHTML);

		// make it fixed-header
		$('.data-table').fixedHeaderTable({ footer: true, cloneHeadToFoot: true, fixedColumn: false });

		// add double click handler
		$('.data-table').on('dblclick', selectTable);

		// show the table
		toggleTable(true);
	};

	// build full table, private
	// builds a table with each individual data point
	const buildFullTable = (data, legends, visible, types) => {
		// start building the table
		let tableHTML = '<table class="data-table">';
		// table header
		tableHTML += '<thead><tr><th id="table-timestamp">Timestamp</th>';

		// loop through all legends
		$.each(legends, (i, val) => {
			if (visible[i]) {
				tableHTML += `<th>${val}</th>`;
			}
		});
		// finish header
		tableHTML += '</tr></thead>';

		// start the body
		tableHTML += '<tbody>';

		// store the date for table formatting
		let lastDay = 0;

		// get x axis limits
		const limits = nodebee.getInfo('xLimits');

		// loop through the data by row
		for (let i = data[0].length - 1; i >= 0; i -= 1) {
			// test timestamp for limits
			if (data[0][i][0] < limits.min || data[0][i][0] > limits.max) {
				// eslint-disable-next-line no-continue
				continue;
			}

			// timestamp
			const dt = DateTime.fromMillis(data[0][i][0], { zone: 'UTC' });

			// timestamp (day of week, day, hour:minute)
			tableHTML += `<tr${
				// new day
				(dt.c.day !== lastDay) ? ' class="data-table-new-day"' : ''
				// odd numbered hour
			}${((dt.c.hour % 2) === 1) ? ' class="data-table-odd-hour"' : ''
			}>`
				+ `<td><table><tr><td>${dt.toLocaleString({ weekday: 'short' })}</td>`
				+ `<td>${dt.toLocaleString({ month: 'short', day: '2-digit' })}</td>`
				+ `<td>${dt.toLocaleString(DateTime.TIME_SIMPLE)}</td></tr></table></td>`;

			// loop through visible columns
			for (let j = 0; j < data.length; j += 1) {
				if (visible[j]) {
					tableHTML += `<td>${
						// hide null values
						formatData(data[j][i][1], types[j])
					}</td>`;
				}
			}
			// finish up row
			tableHTML += '</tr>';

			// remember day
			lastDay = dt.c.day;
		}

		// finish up body
		tableHTML += '</tbody></table>';

		return tableHTML;
	};

	// format data, private
	// format "temperature" data to one decimal place
	const formatData = (_data, type) => {
		// turn null data into blank
		let data = _data ?? '';
		if (type === 'temp' && (`${data}`).indexOf('.') === -1) {
			data += '.0';
		}

		return data;
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
			$('#calc-touch').show(0);
		} else {
			$('#table').css({ left: offscreen });
			$('#chart').css({ left: 0 });
			$('#table-touch').children().eq(0).addClass('fa-table')
				.removeClass('fa-chart-line');
			$('#legend-touch').show(0);
			$('#calc-touch').hide(0);
		}
	};

	// select table, private
	// selects all text in table for easy copying
	const selectTable = () => {
		$('.fht-tbody').selText();
	};

	// is showing, public
	// returns true if the table is showing
	const isShowing = () => $('#table').position().left >= 0;

	// update table, public
	// updates the table if it is showing
	const updateTable = (data, legends, visible, types) => {
		if (isShowing()) {
			showTable(data, legends, visible, types);
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
