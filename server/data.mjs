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

dataRouter.use(express.json());

// errors are passed to express's default handler which logs them and responds with a 500
dataRouter.use('/', validator, async (req, res) => {
	// test for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		res.status(400).json({ errors: errors.array() });
		return;
	}

	// dest for date limits
	const { start, end } = dateCheck(req.body.startDate, req.body.endDate);

	// pick the view based on options provided
	let viewName = 'Minute';
	if (req.body.hourly) viewName = 'Hour';
	if (req.body.daily) viewName = 'Day';

	// set up paramaters
	const paramaters = [req.body.thermostat, start.toJSDate(), end.toJSDate()];

	// get the data
	const thermostatPromise = db.execute(
		`SELECT * FROM Thermostat${viewName} WHERE thermostat_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC;`,
		paramaters,
	);
	const sensorPromise = db.execute(
		`SELECT * FROM Sensor${viewName} WHERE thermostat_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC;`,
		paramaters,
	);

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
