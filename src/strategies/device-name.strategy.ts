import { ICharacteristicConversionStrategy } from '../contracts';

export class DeviceNameStrategy implements ICharacteristicConversionStrategy<'Device Name', string> {
    canHandle(): boolean {
        throw new Error('Method not implemented.');
    }

    convert(): string {
        throw new Error('Method not implemented.');
    }
}
