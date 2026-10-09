// check for date within limits (dates are passed to the function as a timestamp in milliseconds)
// return values as javascript dates

import { DateTime } from 'luxon';
import { MS_PER_DAY } from '../constants.mjs';

const dateCheck = (_start, _end) => {
	let start = _start;
	let end = _end;

	// set default dates if not provided
	if (!start) start = Math.floor(new Date().getTime());
	if (!end) end = Math.floor(new Date().getTime() - MS_PER_DAY * 7);

	// test for inverted dates
	if (end < start) [start, end] = [end, start];

	// check for 32 day limit
	if (end - start > MS_PER_DAY * 32) end = start + MS_PER_DAY * 31;

	// return date objects
	return {
		start: DateTime.fromMillis(start, { zone: 'UTC' }),
		end: DateTime.fromMillis(end, { zone: 'UTC' }),
	};
};

export default dateCheck;
