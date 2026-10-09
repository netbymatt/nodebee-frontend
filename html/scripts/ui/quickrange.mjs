// the date picker's quick links

const { DateTime } = luxon;

// quick range
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

export default quickRange;
