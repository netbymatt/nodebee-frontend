// load configuration from user provided and then fall back to defaults

import Defaults from '../config-defaults.js';

// see if the user config file is available
let User = {};
try {
	User = (await import('../config.js')).default;
} catch (e) {
	if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
}

const isObject = (val) => val !== null && typeof val === 'object' && !Array.isArray(val);

// combine each nested key in an object and fall back to default values if a user value is not provided
// returns a new object, neither argument is modified
const combine = (defaults, user) => {
	const result = { ...defaults };
	Object.entries(user ?? {}).forEach(([key, val]) => {
		if (isObject(val)) {
			result[key] = combine(result[key], val);
		} else if (val !== undefined && val !== null) {
			result[key] = val;
		}
	});
	return result;
};

const config = combine(Defaults, User);

export default config;
