// return data in the correct form for the client
// {
//	columnNames: [columnNames],
//	data: [
//		[data0, data1, data2,...],
//		...
//	],
// }
// timestamps are sent as the difference from the previous row's timestamp

const formatData = (data) => {
	if (data.length === 0) return {};

	// column names are the same for every row
	const columnNames = Object.keys(data[0]);

	// store a "last timestamp" to allow only differences to be sent to the client
	// this saves bandwidth
	let lastTimestamp = 0;
	const formattedData = data.map((row) => columnNames.map((key) => {
		// timestamp requires special handling
		if (key === 'timestamp') {
			const timestamp = row[key].getTime();
			const difference = timestamp - lastTimestamp;
			lastTimestamp = timestamp;
			return difference;
		}
		return row[key];
	}));

	return {
		columnNames,
		data: formattedData,
	};
};

export default formatData;
