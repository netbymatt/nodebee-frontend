// redraw the chart and table together

import { buildDataSet, plotData } from './chart/plot.mjs';
import { buildTableData } from './data/series.mjs';
import { updateTable } from './ui/table.mjs';

// show data
// xRange is the x axis range to show, otherwise all of the data is shown
export const showData = (xRange) => {
	plotData(buildDataSet(), xRange);
	updateTable(buildTableData());
};

// refresh view
// redraw after a change to the series or options, keeping the current x range
export const refreshView = () => showData(document.getElementById('chart').layout.xaxis.range);
