import { Injectable } from '@morgan-stanley/needle';
import { LogLevel } from './contracts';

@Injectable()
/**
 * Replaceable logger. implement this class with your own implementation and provide it as constructor arg to BluetoothHelper
 */
export class Logger {
    public log(level: keyof typeof LogLevel, message: string, ...meta: unknown[]): void {
        console.log(`[${level.toUpperCase()}] ${message}`, ...meta);
    }

    public fatal(message: string, ...meta: unknown[]): void {
        this.log('fatal', message, ...meta);
    }

    public error(message: string, ...meta: unknown[]): void {
        this.log('error', message, ...meta);
    }

    public warn(message: string, ...meta: unknown[]): void {
        this.log('warn', message, ...meta);
    }

    public info(message: string, ...meta: unknown[]): void {
        this.log('info', message, ...meta);
    }

    public debug(message: string, ...meta: unknown[]): void {
        this.log('debug', message, ...meta);
    }

    public trace(message: string, ...meta: unknown[]): void {
        this.log('trace', message, ...meta);
    }
}
