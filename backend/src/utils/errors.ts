import logger from "./logger";


export class BaseError extends Error {
    data: any[];
    logLevel: LogLevel = LogLevel.Error;
    constructor(message: string, ...data: any[]) {
        if (typeof message !== 'string') {
            message = '';
            if (!data) data = [];
            data.push(message);
        }
        super(message);
        this.name = this.constructor.name;
        this.data = data;
    }
}

export enum LogLevel {
    Silly = 'silly',
    Debug = 'debug',
    Verbose = 'verbose',
    Info = 'info',
    Http = 'http',
    Warn = 'warn',
    Error = 'error',
    Fatal = 'fatal',
    Silent = 'silent',
}

export const uncaughtExceptionHandler = (err: Error) => {
    if (!(err instanceof BaseError))
        err = new BaseError(err.message, err.stack);
    (err as BaseError).logLevel = LogLevel.Fatal;
    logger.error('Uncaught Exception', err);
};
