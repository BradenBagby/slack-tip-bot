import { API_PORT } from "./utils/env";
import { uncaughtExceptionHandler } from "./utils/errors";
import express from 'express';
import logger from "./utils/logger";

const app = express();

app.get('/configure', (req, res) => {
    res.send('Configure route');
});

app.get('/tip', (req, res) => {
    res.send('Tip route');
});

app.listen(API_PORT, () => {
    logger.info(`Server is running on port ${API_PORT}`);
});

process.on('uncaughtException', uncaughtExceptionHandler);
process.on('unhandledRejection', uncaughtExceptionHandler);