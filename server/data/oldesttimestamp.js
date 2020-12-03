// store an "oldest" timestamp, updated infrequently, to keep from looking at the database
const timestamp = {
	value: 0,
	// one year ago forces an update
	lastUpdate: new Date().getTime() - 86400000 * 365,
};

const oldest = async (db) => {
	// see if the locally stored value needs to be updated (hourly)
	if (new Date().getTime() - timestamp.lastUpdate > 3600000) {
		// get a new timestamp from the database
		const [result] = await db.query('SELECT MIN(`timestamp`) AS `oldest` FROM `runtime_report_thermostat`;');
		if (result.length !== 1) throw new Error('Unable to find oldest timestamp');

		// update the object
		timestamp.value = result[0].oldest.getTime();
		timestamp.lastUpdate = new Date().getTime();
	}

	return timestamp.value;
};

module.exports = oldest;
