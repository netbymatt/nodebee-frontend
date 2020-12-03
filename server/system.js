// get express
const express = require('express');

// internal functions
const systemInfo = require('./system/info');

// get the database
const connection = require('./sqlconnection');

const router = express.Router();

router.use('/', async (req, res, next) => {
	try {
		// get a database connection
		const db = await connection;

		// respond with formatted data
		res.json(await systemInfo(db));
		return false;
	} catch (e) {
		// generic 500 error, logged locally
		console.error(e);
		next(e);
	}
});
module.exports = router;
