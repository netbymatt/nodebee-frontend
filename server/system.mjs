// get express
import express from 'express';

// internal functions
import systemInfo from './system/info.mjs';

// get the database
import db from './sqlconnection.mjs';

const systemRouter = express.Router();

// errors are passed to express's default handler which logs them and responds with a 500
systemRouter.get('/', async (req, res) => {
	// respond with formatted data
	res.json(await systemInfo(db));
});
export default systemRouter;
