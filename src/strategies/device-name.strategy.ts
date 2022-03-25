import { ICharacteristicConversionStrategy } from '../contracts';

export class DeviceNameStrategy implements ICharacteristicConversionStrategy<'Device Name', string> {
    public readonly characteristicName: 'Device Name' = 'Device Name';
    public readonly sampleValue = 'string';

    canHandle(): boolean {
        throw new Error('Method not implemented.');
    }

    convert(): string {
        throw new Error('Method not implemented.');
    }
}
