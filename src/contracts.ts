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
    readonly characteristicName: TCharacteristic;
    readonly sampleValue: TReturnType;
    canHandle(characteristic: GattCharacteristic<TCharacteristic>): boolean;
    convert(characteristic: GattCharacteristic<TCharacteristic>): TReturnType;
}

export type StrategyList =
    | [ICharacteristicConversionStrategy, ...ICharacteristicConversionStrategy[]]
    | readonly [ICharacteristicConversionStrategy, ...ICharacteristicConversionStrategy[]];

export type StrategyReturnType<
    TLookup extends StrategyList,
    T extends GattCharacteristicName,
> = unknown extends HeadStrategyReturnTypeImpl<TLookup, T> ? DataView : HeadStrategyReturnTypeImpl<TLookup, T>;

type TupleOrReadOnly = [any, ...any[]] | readonly [any, ...any[]];

type HeadStrategyReturnTypeImpl<TLookup extends TupleOrReadOnly, T extends GattCharacteristicName> = ((
    ...characteristicList: TLookup
) => unknown) extends (h: ICharacteristicConversionStrategy<T, infer R>, ...ts: any[]) => unknown
    ? R
    : TailStrategyReturnTypeImpl<TLookup, T>; // lookup has no values

type TailStrategyReturnTypeImpl<TLookup extends TupleOrReadOnly, T extends GattCharacteristicName> = ((
    ...characteristicList: TLookup
) => unknown) extends (h: any, th: infer TH, ...tt: infer TT) => unknown
    ? HeadStrategyReturnTypeImpl<[TH, ...TT], T> // more values in characteristic array so call StrategyReturnType on the tail
    : unknown; // only one item in lookup that does not match T

type strategies = [
    ICharacteristicConversionStrategy<'Device Name', string>,
    ICharacteristicConversionStrategy<'Manufacturer Name String', number>,
];

export type testDeviceName = HeadStrategyReturnTypeImpl<strategies, 'Device Name'>;
export type testManufacturerName = HeadStrategyReturnTypeImpl<strategies, 'Manufacturer Name String'>;
export type testActivityGoalName = HeadStrategyReturnTypeImpl<strategies, 'Activity Goal'>;

export const defaultStrategiesTmp: [DeviceNameStrategy] = [new DeviceNameStrategy()];

//export type testActivityGoalNameTwo = StrategyReturnType<typeof defaultStrategiesTmp, 'Activity Goal'>;

export type StratOrNot<T> = T extends ICharacteristicConversionStrategy<any, infer R> ? R : false;

export type StratInterface = StratOrNot<ICharacteristicConversionStrategy<'Device Name', number>>;
export type StratClass = StratOrNot<DeviceNameStrategy>;
