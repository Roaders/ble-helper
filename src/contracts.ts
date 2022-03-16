export enum LogLevel {
    fatal = 5,
    error = 4,
    warn = 3,
    info = 2,
    debug = 1,
    trace = 0,
}

export type Log = {
    level: LogLevel;
    message: string;
    meta: unknown[];
};
