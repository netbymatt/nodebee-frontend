// get express
const express = require('express');
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');

// internal functions
const dateCheck = require('./data/datecheck');
const oldestTimestamp = require('./data/oldesttimestamp');
const formatData = require('./data/formatdata');

// get the database
const connection = require('./sqlconnection');

const router = express.Router();

// set up the data fields validator
const validator = [
	body('startDate').optional().isInt().toInt(),
	body('endDate').optional().isInt().toInt(),
	body('hourly').toBoolean(),
	body('daily').toBoolean(),
	body('thermostat').isInt().toInt(),
];

router.use(bodyParser.json());

router.use('/', validator, async (req, res, next) => {
	try {
		// test for validation errors
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

		// dest for date limits
		const { start, end } = dateCheck(req.body.startDate, req.body.endDate);

		// get a database connection
		const db = await connection;

		// pick the view based on options provided
		let viewName = 'Minute';
		if (req.body.hourly) viewName = 'Hour';
		if (req.body.daily) viewName = 'Day';

		// set up paramaters
		const paramaters = [req.body.thermostat, start.toJSDate(), end.toJSDate()];

		// get the data
		const thermostatPromise = db.execute(`SELECT * FROM Thermostat${viewName} WHERE thermostat_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC;`,
			paramaters);
		const sensorPromise = db.execute(`SELECT * FROM Sensor${viewName} WHERE thermostat_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC;`,
			paramaters);

		// wait for the data
		const [[thermostat], [sensor]] = await Promise.all([thermostatPromise, sensorPromise]);
		// test for rows returned
		if (thermostat.length === 0) return res.status(204).end(); // no content response

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
		return false;
	} catch (e) {
		// generic 500 error, logged locally
		console.error(e);
		next(e);
	}
});
module.exports = router;
