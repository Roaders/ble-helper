import { Injectable, get } from '@morgan-stanley/needle';
import { from, Observable, of } from 'rxjs';
import { catchError, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { GattCharacteristicId, GattCharacteristicName, GattServiceId, GattServiceName } from './constants';
import { StrategyList, GattService, StrategyReturnType, GattCharacteristic } from './contracts';
import { Logger } from './logger';
import {
    BatteryLevelStrategy,
    DeviceNameStrategy,
    FirmwareRevisionStrategy,
    HardwareRevisionStrategy,
    ManufacturerNameStrategy,
    ModelNumberStrategy,
    SerialNumberStrategy,
    SoftwareRevisionStrategy,
} from './strategies';
import { extract16Bit } from './uuid.helper';

export function getInstance(): BluetoothHelper {
    return get(BluetoothHelper);
}

export const defaultCOnversionStrategies = [
    new ManufacturerNameStrategy(),
    new ModelNumberStrategy(),
    new SerialNumberStrategy(),
    new HardwareRevisionStrategy(),
    new FirmwareRevisionStrategy(),
    new SoftwareRevisionStrategy(),
    new DeviceNameStrategy(),
    new BatteryLevelStrategy(),
] as const;

class BluetoothHelperBase<TStrategyLookup extends StrategyList> {
    private readonly lookup?: TStrategyLookup;

    constructor(private logger: Logger, private readonly strategyList?: TStrategyLookup) {}

    /**
     * Request a bluetooth device. This will launch the browser device picking dialog for a user to choose device
     */
    public requestDevice(
        services: [GattServiceId, ...GattServiceId[]] | RequestDeviceOptions,
        maxRetries = 5,
    ): Observable<BluetoothDevice | undefined> {
        this.logger.info('Requesting Device...', services);

        const options: RequestDeviceOptions = Array.isArray(services)
            ? {
                  filters: [{ services }],
                  optionalServices: services,
              }
            : services;

        return this.requestDeviceImpl(options, maxRetries);
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
    public getService<T extends GattServiceName>(
        server: BluetoothRemoteGATTServer,
        serviceName: T,
        maxRetries = 5,
    ): Observable<GattService<T> | undefined> {
        return this.getServiceImpl(server, serviceName, maxRetries).pipe(
            map((services) => services.find(isServiceWithId(serviceName))),
        );
    }

    /**
     * Returns all services for a given device
     */
    public getServices(server: BluetoothRemoteGATTServer, maxRetries = 5): Observable<GattService[]> {
        return this.getServiceImpl(server, undefined, maxRetries);
    }

    /**
     * Attempts to retrieve a specific characteristic
     */
    public getCharacteristic<T extends GattCharacteristicName>(
        server: BluetoothRemoteGATTServer,
        service: BluetoothRemoteGATTService,
        characteristicId: T,
        maxRetries = 5,
    ): Observable<GattCharacteristic<T> | undefined> {
        return this.getCharacteristicsImpl(server, service, characteristicId, maxRetries).pipe(
            map((characteristics) => characteristics.find(isCharacteristicWithId(characteristicId))),
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
    ): Observable<GattCharacteristic[]> {
        return this.getCharacteristicsImpl(server, service, undefined, maxRetries);
    }
    /**
     * subscribes to notifications for the specified characteristic
     * @param characteristic
     * @returns
     */
    public async readValue<T extends GattCharacteristicName>(
        characteristic: GattCharacteristic<T>,
    ): Promise<StrategyReturnType<TStrategyLookup, T>> {
        const value = await characteristic.gatt.readValue();

        return this.convertValue(characteristic, value);
    }
    /**
     * subscribes to notifications for the specified characteristic
     * @param characteristic
     * @returns
     */
    public getNotifications<T extends GattCharacteristicName>(
        characteristic: GattCharacteristic<T>,
    ): Observable<StrategyReturnType<TStrategyLookup, T>> {
        characteristic.gatt.startNotifications();

        return new Observable((observer) => {
            const handleEvent = () => {
                if (characteristic.gatt.value != null) {
                    const converted = this.convertValue(characteristic, characteristic.gatt.value);
                    observer.next(converted);
                }
            };
            this.logger.info(`Starting Notifications`, characteristic);
            characteristic.gatt.addEventListener('characteristicvaluechanged', handleEvent);

            return {
                unsubscribe: () => {
                    this.logger.info(`Unsubscribe from Notifications`, characteristic);
                    characteristic.gatt.removeEventListener('characteristicvaluechanged', handleEvent);
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

    private convertValue<T extends GattCharacteristicName>(
        characteristic: GattCharacteristic<T>,
        value: DataView,
    ): StrategyReturnType<TStrategyLookup, T> {
        console.log(`COnvert Value: ${characteristic.name}`);

        const matchingStrategy = this.strategyList?.find((strategy) => strategy.canHandle(characteristic));

        if (matchingStrategy != null) {
            const converted = matchingStrategy.convert(characteristic, value);

            return converted as StrategyReturnType<TStrategyLookup, T>;
        }

        return value as StrategyReturnType<TStrategyLookup, T>;
    }

    private requestDeviceImpl(
        options: RequestDeviceOptions,
        maxRetries = 5,
        retries = 0,
    ): Observable<BluetoothDevice | undefined> {
        return from(navigator.bluetooth.requestDevice(options)).pipe(
            tap((device) => this.logger.info(`Device Selected: ${device.name}`, device)),
            catchError((err) => {
                if (err.name === 'NotFoundError') {
                    return of(undefined);
                } else if (retries >= maxRetries) {
                    throw err;
                } else {
                    this.logger.error(`Error selecting device, retrying`, err);
                    return this.requestDeviceImpl(options, maxRetries, retries + 1);
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
        service: GattServiceName | GattServiceId | undefined,
        maxRetries = 5,
        retries = 0,
    ): Observable<GattService[]> {
        this.logger.info(`Getting Service '${service}'...`, server);

        let uuid: number | undefined;

        switch (typeof service) {
            case 'string':
                uuid = GattServiceId[service];
                break;
            case 'number':
                uuid = service;
                break;
        }

        const serviceObservable =
            uuid != null
                ? from(server.getPrimaryService(uuid)).pipe(map((service) => [service]))
                : from(server.getPrimaryServices());

        return serviceObservable.pipe(
            map((services) => services.map(mapGattService)),
            tap((services) =>
                this.logger.info(`Services Connected (${printStringArray(services.map((s) => s.name))})`, services),
            ),
            catchError((err) => {
                if (service != null) {
                    this.logger.error(`Error getting service '${service}' (${retries})`, err);
                } else {
                    this.logger.error(`Error getting services (${retries})`, err);
                }

                if (!server.connected) {
                    return this.connectServerImpl(server.device, maxRetries, retries + 1).pipe(
                        switchMap((newConnectionServer) =>
                            this.getServiceImpl(newConnectionServer, service, maxRetries, retries + 1),
                        ),
                    );
                } else if (retries < maxRetries) {
                    return this.getServiceImpl(server, service, maxRetries, retries + 1);
                } else {
                    throw err;
                }
            }),
        );
    }

    private getCharacteristicsImpl(
        server: BluetoothRemoteGATTServer,
        service: BluetoothRemoteGATTService,
        characteristicName: GattCharacteristicName | undefined,
        maxRetries = 5,
        retries = 0,
    ): Observable<GattCharacteristic[]> {
        this.logger.info(`Getting Characteristics (${characteristicName})...`);

        const uuid = characteristicName != null ? GattCharacteristicId[characteristicName] : undefined;

        const characteristicObservable =
            uuid != null
                ? from(service.getCharacteristic(uuid)).pipe(map((characteristic) => [characteristic]))
                : from(service.getCharacteristics());

        return characteristicObservable.pipe(
            map((characteristics) => characteristics.map(mapGattCharacteristic)),
            tap((characteristics) =>
                this.logger.info(
                    `Characteristics loaded for service (${printStringArray(characteristics.map((c) => c.name))})`,
                    characteristics,
                ),
            ),
            catchError((err) => {
                if (err.name === 'NotFoundError') {
                    return of([]);
                }

                if (characteristicName != null) {
                    this.logger.error(`Error getting characteristic '${characteristicName}' (${retries})`, err);
                } else {
                    this.logger.error(`Error getting characteristics (${retries})`, err);
                }

                if (!server.connected) {
                    return this.connectServerImpl(server.device, maxRetries, retries + 1).pipe(
                        mergeMap((newConnectionServer) =>
                            this.getServiceImpl(
                                newConnectionServer,
                                extract16Bit(service.uuid),
                                maxRetries,
                                retries + 1,
                            ).pipe(
                                mergeMap((newConnectionService) =>
                                    this.getCharacteristicsImpl(
                                        newConnectionServer,
                                        newConnectionService[0].gatt,
                                        characteristicName,
                                        maxRetries,
                                        retries + 1,
                                    ),
                                ),
                            ),
                        ),
                    );
                } else if (retries < maxRetries) {
                    return this.getCharacteristicsImpl(server, service, characteristicName, maxRetries, retries + 1);
                } else {
                    throw err;
                }
            }),
        );
    }
}

@Injectable()
export class BluetoothHelper extends BluetoothHelperBase<typeof defaultCOnversionStrategies> {
    constructor(logger: Logger) {
        super(logger, defaultCOnversionStrategies);
    }
}

function isServiceWithId<T extends GattServiceName>(name: T): (value: GattService) => value is GattService<T> {
    return (value: GattService): value is GattService<T> => value.name === name;
}

function isCharacteristicWithId<T extends GattCharacteristicName>(
    name: T,
): (value: GattCharacteristic) => value is GattCharacteristic<T> {
    return (value: GattCharacteristic): value is GattCharacteristic<T> => value.name === name;
}

function mapGattService(gatt: BluetoothRemoteGATTService): GattService {
    const id = extract16Bit(gatt.uuid);
    return { gatt, id, name: GattServiceId[id] as GattServiceName };
}

function mapGattCharacteristic(gatt: BluetoothRemoteGATTCharacteristic): GattCharacteristic {
    const id = extract16Bit(gatt.uuid);
    return { gatt, id, name: GattCharacteristicId[id] as GattCharacteristicName };
}

function printStringArray(values: (string | undefined)[]): string {
    return values.map((value) => `'${value}'`).join(', ');
}
