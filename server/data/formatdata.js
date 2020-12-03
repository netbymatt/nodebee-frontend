// return data in the correct form for the client
// {
//	columnNames: [columnNames],
//	data: [
//		[data0, data1, data2,...],
//		...
// 	],
// 	}
// }

const format = (data) => {
	if (data.length === 0) return {};
	// store a "last timestamp" to allow only differences to be sent to the client
	// this saves bandwidth
	let lastTimestamp = 0;
	const formattedData = data.map((row) => {
		const values = [];

		// loop through each key
		Object.keys(row).forEach((key) => {
			// get the value
			const val = row[key];
			// timestamp requires special handling
			if (key === 'timestamp') {
				const timestamp = val.getTime();
				values.push(timestamp - lastTimestamp);
				lastTimestamp = timestamp;
			} else {
				values.push(parseFloat(val));
			}
		});
		return values;
	});
	return {
		columnNames: Object.keys(data[0]),
		data: formattedData,
	};
};

module.exports = format;
