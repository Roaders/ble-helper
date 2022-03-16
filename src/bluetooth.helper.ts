import { Injectable } from '@morgan-stanley/needle';
import { from, interval, Observable } from 'rxjs';
import { catchError, map, switchMap, take, tap } from 'rxjs/operators';
import { Logger } from './logger';

@Injectable()
export class BluetoothHelper {
    constructor(private logger: Logger) {}

    public requestDevice(
        services: [BluetoothServiceUUID, ...BluetoothServiceUUID[]],
        maxRetries = 5,
        retries = 0,
    ): Observable<BluetoothDevice> {
        this.logger.info('Requesting Device...', services);
        const requestStream = from(navigator.bluetooth.requestDevice({ filters: [{ services }] })).pipe(
            tap((device) => this.logger.info(`Device Selected: ${device.name}`, device)),
            catchError((err) => {
                if (retries >= maxRetries || err.name === 'NotFoundError') {
                    throw err;
                } else {
                    this.logger.error(`Error selecting device`, err);
                    return this.requestDevice(services, maxRetries, retries + 1);
                }
            }),
        );

        return requestStream;
    }

    public connectServer(device: BluetoothDevice, maxRetries = 5, retries = 0): Observable<BluetoothRemoteGATTServer> {
        if (device.gatt == null) {
            throw new Error(`gatt is not defined on device`);
        }

        const server = device.gatt;

        return new Observable<BluetoothRemoteGATTServer>((observer) => {
            let unsubscribed = false;
            this.logger.info(`Connecting to Server...`);

            server.connect().then(
                () => {
                    if (unsubscribed) {
                        server.disconnect();
                    } else {
                        this.logger.info(`Server Connected...`, server);
                        observer.next(server);
                    }
                },
                (error) => observer.error(error),
            );

            return {
                unsubscribe: () => {
                    unsubscribed = true;
                    if (server.connected) {
                        this.logger.info(`connectServer.unsubscribe: Disconnecting from server...`, server);
                        server.disconnect();
                    } else {
                        this.logger.info(`connectServer.unsubscribe: Server already disconnected`, server);
                    }
                },
            };
        }).pipe(
            catchError((err) => {
                if (retries < maxRetries) {
                    this.logger.error(`Error connecting to server`, err);
                    return this.connectServer(device, maxRetries, retries + 1);
                } else {
                    throw err;
                }
            }),
        );
    }

    public getService(
        server: BluetoothRemoteGATTServer,
        service: BluetoothServiceUUID,
        maxRetries = 5,
        retries = 0,
    ): Observable<BluetoothRemoteGATTService> {
        this.logger.info(`Getting Service '${service}'...`, server);

        return from(server.getPrimaryService(service)).pipe(
            tap((service) => this.logger.info(`Service Connected`, service)),
            catchError((err) => {
                this.logger.error(`Error getting service '${service}' (${retries})`, err);

                if (!server.connected) {
                    return this.connectServer(server.device, maxRetries, retries + 1).pipe(
                        switchMap((newConnectionServer) =>
                            this.getService(newConnectionServer, service, maxRetries, retries + 1),
                        ),
                    );
                } else if (retries < maxRetries) {
                    return this.getService(server, service, maxRetries, retries + 1);
                } else {
                    throw err;
                }
            }),
        );
    }

    public getNotifications(characteristic: BluetoothRemoteGATTCharacteristic): Observable<DataView> {
        characteristic.startNotifications();

        return new Observable((observer) => {
            function handleEvent() {
                if (characteristic.value != null) {
                    observer.next(characteristic.value);
                }
            }
            this.logger.info(`Starting Notifications`, characteristic);
            characteristic.addEventListener('characteristicvaluechanged', handleEvent);

            return {
                unsubscribe: () => {
                    this.logger.info(`UNsubscribe from Notifications`, characteristic);
                    characteristic.removeEventListener('characteristicvaluechanged', handleEvent);
                },
            };
        });
    }

    public createTimeOutStream<T>(timeInMs: number): Observable<T> {
        this.logger.info(`Starting timeout stream...`, timeInMs);

        return interval(timeInMs).pipe(
            take(1),
            map(() => {
                this.logger.warn(`Stream time out`);
                throw new Error(`Timeout waiting for device connection.`);
            }),
        );
    }

    public createDeviceDisconnectionStream(device: BluetoothDevice): Observable<BluetoothDevice> {
        return new Observable<BluetoothDevice>((observer) => {
            const logger = this.logger;
            function handleEvent() {
                logger.info(`Device '${device.name}' disconnected`, device);
                observer.next(device);
            }
            logger.info(`Add event listener: gattserverdisconnected`, device);
            device.addEventListener('gattserverdisconnected', handleEvent);

            return {
                unsubscribe: () => {
                    this.logger.info(`Remove Event Listener: gattserverdisconnected`);
                    device.removeEventListener('gattserverdisconnected', handleEvent);
                },
            };
        });
    }
}
