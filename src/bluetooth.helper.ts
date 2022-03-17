import { Injectable } from '@morgan-stanley/needle';
import { from, Observable } from 'rxjs';
import { catchError, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { GattService } from './constants';
import { Logger } from './logger';

@Injectable()
export class BluetoothHelper {
    constructor(private logger: Logger) {}

    /**
     * Request a bluetooth device. This will launch the browser device picking dialog for a user to choose device
     */
    public requestDevice(services: [GattService, ...GattService[]], maxRetries = 5): Observable<BluetoothDevice> {
        this.logger.info('Requesting Device...', services);
        return this.requestDeviceImpl(services, maxRetries);
    }

    /**
     * Connects to devices Gatt server
     */
    public connectServer(device: BluetoothDevice, maxRetries = 5): Observable<BluetoothRemoteGATTServer> {
        return this.connectServerImpl(device, maxRetries);
    }

    /**
     * Attempts to connect to a specific service on the device
     */
    public getService(
        server: BluetoothRemoteGATTServer,
        service: BluetoothServiceUUID,
        maxRetries = 5,
    ): Observable<BluetoothRemoteGATTService> {
        return this.getServiceImpl(server, service, maxRetries).pipe(map((services) => services[0]));
    }

    /**
     * Returns all services for a given device
     */
    public getServices(server: BluetoothRemoteGATTServer, maxRetries = 5): Observable<BluetoothRemoteGATTService[]> {
        return this.getServiceImpl(server, undefined, maxRetries);
    }

    /**
     * Attempts to retrieve a specific characteristic
     */
    public getCharacteristic(
        server: BluetoothRemoteGATTServer,
        service: BluetoothRemoteGATTService,
        characteristicUuid: BluetoothCharacteristicUUID | undefined,
        maxRetries = 5,
    ): Observable<BluetoothRemoteGATTCharacteristic> {
        return this.getCharacteristicsImpl(server, service, characteristicUuid, maxRetries).pipe(
            map((characteristics) => characteristics[0]),
        );
    }

    /**
     * Gets all characteristics for a given service
     * @param server
     * @param service
     * @param maxRetries
     * @returns
     */
    public getCharacteristics(
        server: BluetoothRemoteGATTServer,
        service: BluetoothRemoteGATTService,
        maxRetries = 5,
    ): Observable<BluetoothRemoteGATTCharacteristic[]> {
        return this.getCharacteristicsImpl(server, service, undefined, maxRetries);
    }

    /**
     * subscribes to notifications for the specified characteristic
     * @param characteristic
     * @returns
     */
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
                    this.logger.info(`Unsubscribe from Notifications`, characteristic);
                    characteristic.removeEventListener('characteristicvaluechanged', handleEvent);
                },
            };
        });
    }

    /**
     * returns a stream that fires when the device disconnects
     */
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

    private requestDeviceImpl(
        services: [BluetoothServiceUUID, ...BluetoothServiceUUID[]],
        maxRetries = 5,
        retries = 0,
    ): Observable<BluetoothDevice> {
        return from(
            navigator.bluetooth.requestDevice({
                filters: [{ services }],
                optionalServices: [
                    GattService.Battery,
                    GattService['Generic Access'],
                    GattService['Generic Attribute'],
                    GattService['Device Information'],
                ],
            }),
        ).pipe(
            tap((device) => this.logger.info(`Device Selected: ${device.name}`, device)),
            catchError((err) => {
                if (retries >= maxRetries || err.name === 'NotFoundError') {
                    throw err;
                } else {
                    this.logger.error(`Error selecting device, retrying`, err);
                    return this.requestDeviceImpl(services, maxRetries, retries + 1);
                }
            }),
        );
    }

    private connectServerImpl(
        device: BluetoothDevice,
        maxRetries = 5,
        retries = 0,
    ): Observable<BluetoothRemoteGATTServer> {
        if (device.gatt == null) {
            throw new Error(`gatt is not defined on device`);
        }

        const server = device.gatt;

        this.logger.info(`Connecting to Server...`);
        return from(server.connect()).pipe(
            catchError((err) => {
                if (retries < maxRetries) {
                    this.logger.error(`Error connecting to server`, err);
                    return this.connectServerImpl(device, maxRetries, retries + 1);
                } else {
                    throw err;
                }
            }),
        );
    }

    private getServiceImpl(
        server: BluetoothRemoteGATTServer,
        serviceUUID: BluetoothServiceUUID | undefined,
        maxRetries = 5,
        retries = 0,
    ): Observable<BluetoothRemoteGATTService[]> {
        this.logger.info(`Getting Service '${serviceUUID}'...`, server);

        const serviceObservable =
            serviceUUID != null
                ? from(server.getPrimaryService(serviceUUID)).pipe(map((service) => [service]))
                : from(server.getPrimaryServices());

        return serviceObservable.pipe(
            tap((service) => this.logger.info(`Service Connected`, service)),
            catchError((err) => {
                if (serviceUUID != null) {
                    this.logger.error(`Error getting service '${serviceUUID}' (${retries})`, err);
                } else {
                    this.logger.error(`Error getting services (${retries})`, err);
                }

                if (!server.connected) {
                    return this.connectServerImpl(server.device, maxRetries, retries + 1).pipe(
                        switchMap((newConnectionServer) =>
                            this.getServiceImpl(newConnectionServer, serviceUUID, maxRetries, retries + 1),
                        ),
                    );
                } else if (retries < maxRetries) {
                    return this.getServiceImpl(server, serviceUUID, maxRetries, retries + 1);
                } else {
                    throw err;
                }
            }),
        );
    }

    private getCharacteristicsImpl(
        server: BluetoothRemoteGATTServer,
        service: BluetoothRemoteGATTService,
        characteristicUuid: BluetoothCharacteristicUUID | undefined,
        maxRetries = 5,
        retries = 0,
    ): Observable<BluetoothRemoteGATTCharacteristic[]> {
        this.logger.info(`Getting Characteristics (${service.uuid})...`);

        const characteristicObservable =
            characteristicUuid != null
                ? from(service.getCharacteristic(characteristicUuid)).pipe(map((characteristic) => [characteristic]))
                : from(service.getCharacteristics());

        return characteristicObservable.pipe(
            tap((characteristics) =>
                this.logger.info(`Characteristics loaded (${service.uuid}/${characteristicUuid})`, characteristics),
            ),
            catchError((err) => {
                if (characteristicUuid != null) {
                    this.logger.error(`Error getting characteristic '${characteristicUuid}' (${retries})`, err);
                } else {
                    this.logger.error(`Error getting characteristics (${retries})`, err);
                }

                if (!server.connected) {
                    return this.connectServerImpl(server.device, maxRetries, retries + 1).pipe(
                        mergeMap((newConnectionServer) =>
                            this.getServiceImpl(newConnectionServer, service.uuid, maxRetries, retries + 1).pipe(
                                mergeMap((newConnectionService) =>
                                    this.getCharacteristicsImpl(
                                        newConnectionServer,
                                        newConnectionService[0],
                                        characteristicUuid,
                                        maxRetries,
                                        retries + 1,
                                    ),
                                ),
                            ),
                        ),
                    );
                } else if (retries < maxRetries) {
                    return this.getCharacteristicsImpl(server, service, characteristicUuid, maxRetries, retries + 1);
                } else {
                    throw err;
                }
            }),
        );
    }
}
