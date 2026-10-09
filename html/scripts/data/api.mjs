// requests to the server

// thermostats and their sensors
export const fetchSystem = () => $.ajax({
	url: 'system',
	type: 'GET',
	dataType: 'json',
	contentType: 'application/json',
});

// runtime data, start date and end date are milliseconds since the unix epoch
// checks are made on server side
// resolves with undefined when there is no data in the range
export const fetchData = ({
	thermostat, startDate, endDate, hourly, daily,
}) => $.ajax({
	url: 'data',
	type: 'POST',
	data: JSON.stringify({
		startDate,
		endDate,
		hourly,
		daily,
		thermostat,
	}),
	dataType: 'json',
	contentType: 'application/json',
});
