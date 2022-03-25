/* eslint-disable @typescript-eslint/no-explicit-any */
import { GattCharacteristicId, GattCharacteristicName, GattServiceId, GattServiceName } from './constants';
import { DeviceNameStrategy } from './strategies';

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

export interface ICharacteristicConversionStrategy<
    TCharacteristic extends GattCharacteristicName = GattCharacteristicName,
    TReturnType = unknown,
> {
    canHandle(characteristic: GattCharacteristic<TCharacteristic>): boolean;
    convert(characteristic: GattCharacteristic<TCharacteristic>): TReturnType;
}

export type StrategyList = [any, ...any[]] | readonly [any, ...any[]];

export type StrategyReturnType<
    TLookup extends StrategyList,
    T extends GattCharacteristicName,
> = unknown extends StrategyReturnTypeImpl<TLookup, T> ? DataView : StrategyReturnTypeImpl<TLookup, T>;

type StrategyReturnTypeImpl<TLookup extends StrategyList, T extends GattCharacteristicName> = ((
    ...characteristicList: TLookup
) => unknown) extends (h: infer Head, ...ts: infer Tail) => unknown
    ? ((h: Head) => unknown) extends (h: ICharacteristicConversionStrategy<T, infer CharacteristicValue>) => unknown
        ? CharacteristicValue // first value in array of strategies matches so return
        : ((h: unknown, ...tail: Tail) => unknown) extends (h: unknown, ...tail: [infer TH, ...infer TT]) => unknown
        ? StrategyReturnTypeImpl<[TH, ...TT], T> // more values in characteristic array so call StrategyReturnType on the tail
        : unknown // only one item in lookup that does not match T
    : unknown; // lookup has no values

type strategies = [
    ICharacteristicConversionStrategy<'Device Name', string>,
    ICharacteristicConversionStrategy<'Manufacturer Name String', number>,
];

export type testDeviceName = StrategyReturnTypeImpl<strategies, 'Device Name'>;
export type testManufacturerName = StrategyReturnTypeImpl<strategies, 'Manufacturer Name String'>;
export type testActivityGoalName = StrategyReturnTypeImpl<strategies, 'Activity Goal'>;

export const defaultStrategiesTmp: [DeviceNameStrategy] = [new DeviceNameStrategy()];

export type testActivityGoalNameTwo = StrategyReturnType<typeof defaultStrategiesTmp, 'Activity Goal'>;
