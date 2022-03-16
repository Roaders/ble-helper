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

export interface ILogger {
  log(level: keyof typeof LogLevel, message: string, ...meta: unknown[]): void;
  fatal(message: string, ...meta: unknown[]): void;
  error(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  info(message: string, ...meta: unknown[]): void;
  debug(message: string, ...meta: unknown[]): void;
  trace(message: string, ...meta: unknown[]): void;
}
