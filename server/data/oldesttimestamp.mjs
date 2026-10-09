// store an "oldest" timestamp, updated infrequently, to keep from looking at the database
import { MS_PER_DAY, MS_PER_HOUR } from '../constants.mjs';

const timestamp = {
	value: 0,
	// one year ago forces an update
	lastUpdate: new Date().getTime() - MS_PER_DAY * 365,
};

const oldestTimestamp = async (db) => {
	// see if the locally stored value needs to be updated (hourly)
	if (new Date().getTime() - timestamp.lastUpdate > MS_PER_HOUR) {
		// get a new timestamp from the database
		const [result] = await db.query("SELECT MIN(`timestamp`) AS `oldest` FROM `runtime_report_thermostat` WHERE `timestamp` > '1970-01-01';");

		// update the object
		timestamp.value = result[0].oldest.getTime();
		timestamp.lastUpdate = new Date().getTime();
	}

	return timestamp.value;
};

export default oldestTimestamp;
