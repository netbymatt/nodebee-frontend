// remember the viewer's choices between visits in local storage
// storage can be unavailable (private browsing, blocked site data) in which case nothing is remembered
//
// stored values:
// thermostat: thermostat id
// interval: 'minute', 'hourly' or 'daily'
// range: { quick: '<quick link name>' } recalculated on each visit, or { start, end } in milliseconds
// hidden: names of series that are turned off
// occupancy: true when only occupied temperatures are shown

const KEY = 'nodebee-settings';

const load = () => {
	try {
		return JSON.parse(localStorage.getItem(KEY)) ?? {};
	} catch {
		return {};
	}
};

// merge changes into the stored settings
const save = (changes) => {
	try {
		localStorage.setItem(KEY, JSON.stringify({ ...load(), ...changes }));
	} catch {
		// storage unavailable, settings are not remembered
	}
};

export default { load, save };
