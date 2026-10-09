// check for date within limits (dates are passed to the function as a timestamp in milliseconds)
// return values as luxon DateTimes

import { DateTime } from 'luxon';
import { MS_PER_DAY } from '../constants.mjs';

// maximum number of days that can be requested
const MAX_DAYS = 32;

const dateCheck = (_start, _end) => {
	let start = _start;
	let end = _end;

	// set default dates if not provided, the last 7 days
	if (!end) end = Date.now();
	if (!start) start = end - MS_PER_DAY * 7;

	// test for inverted dates
	if (end < start) [start, end] = [end, start];

	// limit the range by keeping the end date and moving the start date forward
	if (end - start > MS_PER_DAY * MAX_DAYS) start = end - MS_PER_DAY * MAX_DAYS;

	// return date objects
	return {
		start: DateTime.fromMillis(start, { zone: 'UTC' }),
		end: DateTime.fromMillis(end, { zone: 'UTC' }),
	};
};

export default dateCheck;
