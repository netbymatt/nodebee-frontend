// load configuration from user provided and then fall back to defaults

import Defaults from '../config-defaults.js';
import objForEach from './objforeach.mjs';

// see if the user config file is available
let User = null;
try {
	User = (await import('../config.js')).default;
} catch (e) {
	if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
}

// combine each nested key in an object and fall back to default values if a user value is not provided
const combine = (user, defaults) => {
	if (user === null) return defaults;
	const result = defaults;
	objForEach(user, (key, val) => {
		if (result[key] === undefined) result[key] = {};
		if (typeof val === 'object') return combine(val, result[key]);
		if (val !== undefined && val !== null) result[key] = val;
		return false;
	});
	return result;
};

const config = combine(User, Defaults);

export default config;
