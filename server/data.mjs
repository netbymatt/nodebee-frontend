// get express
import express from 'express';
import { body, validationResult } from 'express-validator';

// internal functions
import dateCheck from './data/datecheck.mjs';
import oldestTimestamp from './data/oldesttimestamp.mjs';
import formatData from './data/formatdata.mjs';

// get the database
import db from './sqlconnection.mjs';

const dataRouter = express.Router();

// set up the data fields validator
const validator = [
	body('startDate').optional().isInt().toInt(),
	body('endDate').optional().isInt().toInt(),
	body('hourly').toBoolean(),
	body('daily').toBoolean(),
	body('thermostat').isInt().toInt(),
];

// queries for each interval, parameters are thermostat_id, start, end
// the hour and day views can't filter before grouping and aggregate the whole table on every request
// so these queries match the views' columns but filter the underlying tables before grouping
const range = 'thermostat_id = ? AND `timestamp` >= ? AND `timestamp` <= ?';
const setpoint = "CASE WHEN zone_hvac_mode LIKE '%cool%' THEN zone_cool_temperature ELSE zone_heat_temperature END";
const queries = {
	minute: {
		thermostat: `SELECT * FROM ThermostatMinute WHERE ${range} ORDER BY \`timestamp\` ASC;`,
		sensor: `SELECT * FROM SensorMinute WHERE ${range} ORDER BY \`timestamp\` ASC;`,
	},
	hour: {
		thermostat: `SELECT MIN(\`timestamp\`) AS \`timestamp\`, thermostat_id,
			ROUND(SUM(fan) / 60, 0) AS fan,
			ROUND(SUM(compressor_cool_1) / 60, 0) AS cool,
			ROUND(SUM(auxiliary_heat_1) / 60, 0) AS heat,
			ROUND(AVG(outdoor_temperature), 1) AS outside,
			ROUND(AVG(${setpoint}), 0) AS setpoint,
			ROUND(AVG(zone_average_temperature), 1) AS average
			FROM runtime_report_thermostat WHERE ${range}
			GROUP BY thermostat_id, tsyear, tsmonth, tsday, tshour ORDER BY \`timestamp\` ASC;`,
		sensor: `SELECT MIN(\`timestamp\`) AS \`timestamp\`, sensor_id, thermostat_id,
			ROUND(AVG(temperature), 1) AS temperature,
			ROUND(AVG(humidity), 1) AS humidity
			FROM runtime_report_sensor WHERE ${range}
			GROUP BY thermostat_id, sensor_id, tsyear, tsmonth, tsday, tshour ORDER BY \`timestamp\` ASC;`,
	},
	day: {
		thermostat: `SELECT MIN(\`timestamp\`) AS \`timestamp\`, thermostat_id,
			ROUND(SUM(fan) / 3600, 1) AS fan,
			ROUND(SUM(compressor_cool_1) / 3600, 1) AS cool,
			ROUND(SUM(auxiliary_heat_1) / 3600, 1) AS heat,
			ROUND(AVG(outdoor_temperature), 1) AS outside,
			MIN(outdoor_temperature) AS \`outside min\`,
			MAX(outdoor_temperature) AS \`outside max\`,
			ROUND(AVG(${setpoint}), 0) AS setpoint,
			ROUND(AVG(zone_average_temperature), 1) AS average
			FROM runtime_report_thermostat WHERE ${range}
			GROUP BY thermostat_id, tsyear, tsmonth, tsday ORDER BY \`timestamp\` ASC;`,
		sensor: `SELECT MIN(\`timestamp\`) AS \`timestamp\`, sensor_id, thermostat_id,
			ROUND(AVG(temperature), 1) AS temperature,
			ROUND(AVG(humidity), 1) AS humidity
			FROM runtime_report_sensor WHERE ${range}
			GROUP BY thermostat_id, sensor_id, tsyear, tsmonth, tsday ORDER BY \`timestamp\` ASC;`,
	},
};

// errors are passed to express's default handler which logs them and responds with a 500
dataRouter.post('/', express.json(), validator, async (req, res) => {
	// test for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		res.status(400).json({ errors: errors.array() });
		return;
	}

	// test for date limits
	const { start, end } = dateCheck(req.body.startDate, req.body.endDate);

	// pick the queries based on options provided
	let interval = 'minute';
	if (req.body.hourly) interval = 'hour';
	if (req.body.daily) interval = 'day';

	// set up parameters
	const parameters = [req.body.thermostat, start.toJSDate(), end.toJSDate()];

	// get the data
	const thermostatPromise = db.execute(queries[interval].thermostat, parameters);
	const sensorPromise = db.execute(queries[interval].sensor, parameters);

	// wait for the data
	const [[thermostat], [sensor]] = await Promise.all([thermostatPromise, sensorPromise]);
	// test for rows returned
	if (thermostat.length === 0) {
		res.status(204).end(); // no content response
		return;
	}

	// add an expires header when in production
	if (process.env.NODE_ENV === 'production') res.set('Cache-Control', 'public, max-age=300');	// 5 minutes

	// respond with formatted data
	res.json({
		hourly: req.body.hourly,
		daily: req.body.daily,
		oldestTimestamp: await oldestTimestamp(db),
		thermostat: formatData(thermostat),
		sensor: formatData(sensor),
	});
});
export default dataRouter;
