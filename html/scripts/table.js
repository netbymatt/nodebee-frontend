// launch
$(function() {
	table.init();
});

var table = (function() {
	var DateTime = luxon.DateTime;	// alias object

	// initialize, public
	var init = function() {
		// calc (sum) button
		$("#calc-touch").hide(0);
	}
	
	// jquery plugin for selecting text
	jQuery.fn.selText = function() {
		var obj = this[0];
		var selection = obj.ownerDocument.defaultView.getSelection();
		var range = obj.ownerDocument.createRange();
		range.selectNodeContents(obj);
		selection.removeAllRanges();
		selection.addRange(range);
		return this;
	}
	
	var showTable = function(data, legends, visible, types) {

		// table html
		var table;

		// pass table building to the appropriate function
		table = buildFullTable(data, legends, visible, types);
		
		// put table on page
		$("#table").html(table);
		
		// make it fixed-header
		$(".data-table").fixedHeaderTable({ footer: true, cloneHeadToFoot: true, fixedColumn: false});

		// add double click handler
		$(".data-table").on("dblclick", selectTable);
		
		// show the table
		toggleTable(true);
	}

	// build full table, private
	// builds a table with each individual data point
	var buildFullTable = function(data, legends, visible, types, options) {
		// start building the table
		var table = '<table class="data-table">';
		// table header
		table += '<thead><tr><th id="table-timestamp">Timestamp</th>';
		
		// loop through all legends
		$.each(legends, function(i, val) {
			if (visible[i]) {
				table += '<th>' + val + '</th>';
			}
		});
		// finish header
		table += '</tr></thead>';

		// start the body
		table += '<tbody>';
		
		// store the date for table formatting
		var lastDay = 0;

		// get x axis limits
		var limits = thermostat.getInfo("xLimits");
		
		// loop through the data by row
		for (var i = data[0].length - 1; i >= 0; i--) {
			// test timestamp for limits
			if (data[0][i][0] < limits.min || data[0][i][0] > limits.max) {
				continue;
			}

			// timestamp
			dt = DateTime.fromMillis(data[0][i][0], {zone: 'UTC'});

			// timestamp (day of week, day, hour:minute)
			table += '<tr' +
				// new day
				((dt.c.day != lastDay) ? ' class="data-table-new-day"' : '') + 
				// odd numbered hour
				(((dt.c.hour % 2) == 1) ? ' class="data-table-odd-hour"' : '') + 
				'>' +
				'<td><table><tr><td>' + dt.toLocaleString({weekday: 'short'}) + "</td>" +
				'<td>' + dt.toLocaleString({month: 'short', day: '2-digit'}) + "</td>" +
				'<td>' + dt.toLocaleString(DateTime.TIME_SIMPLE) + '</td></tr></table></td>';
				
			// loop through visible columns
			for (var j = 0; j < data.length; j++) {
				if (visible[j]) {
					table += '<td>' + 
						// hide null values
						formatData(data[j][i][1], types[j]) +
						'</td>';
				}
			}
			// finish up row
			table += '</tr>';
			
			// remember day
			lastDay = dt.c.day;
		}
		
		// finish up body
		table += '</tbody></table>';

		return table;
	}

	// format data, private
	// format "temperature" data to one decimal place
	var formatData = function(data, type) {
		// turn null data into blank
		data = (data === null) ? '' : data;
		if (type == "temp" && ('' + data).indexOf('.') == -1) {
			data += ".0";
		}

		return data;
	}

	// toggle table, public
	// show the table (true) or chart
	var toggleTable = function(showTable) {
		// calc safe off screen position
		var offscreen = -$("#chart").width() * 10;
		if (showTable) {
			$("#table").css({left: 0});
			$("#chart").css({left: offscreen});
			$("#table-touch").children().eq(0).addClass("fa-chart-line").removeClass("fa-table");
			$("#legend-touch").hide(0);
			$("#calc-touch").show(0);
		} else {
			$("#table").css({left: offscreen});
			$("#chart").css({left: 0});
			$("#table-touch").children().eq(0).addClass("fa-table").removeClass("fa-chart-line");
			$("#legend-touch").show(0);
			$("#calc-touch").hide(0);
		}

	}

	// select table, private
	// selects all text in table for easy copying
	var selectTable = function() {
		$(".fht-tbody").selText();
	}

	// is showing, public
	// returns true if the table is showing
	var isShowing = function() {
		return $("#table").position().left >= 0;
	}

	// update table, public
	// updates the table if it is showing
	var updateTable = function(data, legends, visible, types) {
		if (isShowing()) {
			showTable(data, legends, visible, types);
		}
	}
	
	return {
		init: init,
		showTable: showTable,
		toggleTable: toggleTable,
		isShowing: isShowing,
		updateTable: updateTable,
	}
})();

