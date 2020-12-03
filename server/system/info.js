// store get and cache system info with thermostat and sensor information
const info = {
	value: undefined,
	// one year ago forces an update on load
	lastUpdate: new Date().getTime() - 86400000 * 365,
};

const systemInfo = async (db) => {
	// see if the locally stored value needs to be updated (hourly)
	if (new Date().getTime() - info.lastUpdate > 3600000) {
		// get a new data from database
		const [result] = await db.query('SELECT * FROM SystemInfo;');
		if (result.length === 0) throw new Error('Unable to find system info');

		// update the object
		info.value = result;
		info.lastUpdate = new Date().getTime();
	}

	return info.value;
};

module.exports = systemInfo;
