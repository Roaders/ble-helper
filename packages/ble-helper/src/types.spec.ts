import { defaultConversionStrategies } from '.';
import { ICharacteristicConversionStrategy, StrategyReturnType } from './contracts';

// This is just for testing the strategy types

type strategyInterfaces = [
    ICharacteristicConversionStrategy<'Device Name', string>,
    ICharacteristicConversionStrategy<'Battery Level', number>,
];

export type testDeviceName = StrategyReturnType<strategyInterfaces, 'Device Name'>; // should be typed as string
export type testBatteryLevel = StrategyReturnType<strategyInterfaces, 'Battery Level'>; // should be typed as number
export type testActivityGoal = StrategyReturnType<strategyInterfaces, 'Activity Goal'>; // should be typed as DataView

export const deviceName: StrategyReturnType<strategyInterfaces, 'Device Name'> = 'Sample String';
export const batteryLevel: StrategyReturnType<strategyInterfaces, 'Battery Level'> = 55;
export const activityGoal: StrategyReturnType<strategyInterfaces, 'Activity Goal'> = new DataView(new ArrayBuffer(1));

class DeviceNameStrategy implements ICharacteristicConversionStrategy<'Device Name', string> {
    name = 'Device Name' as const;
    canHandle(): boolean {
        throw new Error('Method not implemented.');
    }
    convert(): string {
        throw new Error('Method not implemented.');
    }
}

class BatteryLevelStrategy implements ICharacteristicConversionStrategy<'Battery Level', number> {
    name = 'Battery Level' as const;
    canHandle(): boolean {
        throw new Error('Method not implemented.');
    }
    convert(): number {
        throw new Error('Method not implemented.');
    }
}

type strategyClasses = [DeviceNameStrategy, BatteryLevelStrategy];

export const strategyDeviceName: StrategyReturnType<strategyClasses, 'Device Name'> = 'Sample String';
export const strategyBatteryLevel: StrategyReturnType<strategyClasses, 'Battery Level'> = 55;

export const defaultDeviceName: StrategyReturnType<typeof defaultConversionStrategies, 'Device Name'> = 'Sample String';
export const defaultBatteryLevel: StrategyReturnType<typeof defaultConversionStrategies, 'Battery Level'> = 55;
