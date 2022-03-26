/* eslint-disable @typescript-eslint/no-explicit-any */
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

export interface ICharacteristicConversionStrategy<
    TCharacteristic extends GattCharacteristicName = GattCharacteristicName,
    TReturnType = unknown,
> {
    name: TCharacteristic;
    canHandle(characteristic: GattCharacteristic<TCharacteristic>): boolean;
    convert(characteristic: GattCharacteristic<TCharacteristic>, value: DataView): TReturnType;
}

/**
 * Creates a tuple
 */
export const tuple = <T extends any[]>(...args: T): T => args;

export type StrategyList = [...ICharacteristicConversionStrategy[]];

export type StrategyReturnType<
    TLookup extends StrategyList,
    T extends GattCharacteristicName,
> = unknown extends StrategyReturnTypeImpl<TLookup, T> ? DataView : StrategyReturnTypeImpl<TLookup, T>;

// Removes head from list and passes it to HeadStrategyReturnTypeImpl
type StrategyReturnTypeImpl<TStrategyList extends [...any[]], T extends GattCharacteristicName> = ((
    ...characteristicList: TStrategyList
) => unknown) extends (h: infer Head, ...tt: any[]) => unknown
    ? HeadStrategyReturnTypeImpl<Head, TStrategyList, T>
    : unknown;

// If Strategy type matches T returns that strategy, if not passes list to TailStrategyReturnTypeImpl
type HeadStrategyReturnTypeImpl<
    TStrategy,
    TStrategyList extends [...any[]],
    T extends GattCharacteristicName,
> = TStrategy extends ICharacteristicConversionStrategy<T, infer R> ? R : TailStrategyReturnTypeImpl<TStrategyList, T>;

// Removes Head from list and if a tail exists passes it to StrategyReturnTypeImpl
type TailStrategyReturnTypeImpl<
    TStrategyListTail extends [...any[]],
    T extends GattCharacteristicName,
> = TStrategyListTail extends [any, infer TailHead, ...infer LTail]
    ? StrategyReturnTypeImpl<[TailHead, ...LTail], T>
    : unknown;
