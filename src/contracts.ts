import { GattCharacteristicId, GattCharacteristicName, GattServiceId, GattServiceName } from './constants';

export enum LogLevel {
    fatal = 5,
    error = 4,
    warn = 3,
    info = 2,
    debug = 1,
    trace = 0,
}

export type DisplayValue<T> = {
    display: string;
    value: T;
};

export interface GattService<T extends GattServiceName = GattServiceName> {
    id: GattServiceId;
    name?: T;
    gatt: BluetoothRemoteGATTService;
}

export interface GattCharacteristic<T extends GattCharacteristicName = GattCharacteristicName> {
    id: GattCharacteristicId;
    name?: T;
    gatt: BluetoothRemoteGATTCharacteristic;
}

export interface ICharacteristicConversionStrategy {
    canHandle(): boolean;
    handle(): string;
}
