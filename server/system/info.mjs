// get and cache system info with thermostat and sensor information
import { MS_PER_DAY, MS_PER_HOUR } from '../constants.mjs';

const info = {
	value: undefined,
	// one year ago forces an update on load
	lastUpdate: new Date().getTime() - MS_PER_DAY * 365,
};

const systemInfo = async (db) => {
	// see if the locally stored value needs to be updated (hourly)
	if (new Date().getTime() - info.lastUpdate > MS_PER_HOUR) {
		// get new data from the database
		const [result] = await db.query('SELECT * FROM SystemInfo;');
		if (result.length === 0) throw new Error('Unable to find system info');

		// update the object
		info.value = result;
		info.lastUpdate = new Date().getTime();
	}

	return info.value;
};

export default systemInfo;
