// get express
import express from 'express';

// internal functions
import systemInfo from './system/info.mjs';

// get the database
import db from './sqlconnection.mjs';

const systemRouter = express.Router();

systemRouter.use('/', async (req, res, next) => {
	try {
		// respond with formatted data
		res.json(await systemInfo(db));
		return false;
	} catch (e) {
		// generic 500 error, logged locally
		console.error(e);
		next(e);
		return false;
	}
});
export default systemRouter;
