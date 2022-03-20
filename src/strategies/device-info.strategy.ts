import { ICharacteristicConversionStrategy } from '../contracts';

export class DeviceInfoStrategy implements ICharacteristicConversionStrategy {
    canHandle(): boolean {
        throw new Error('Method not implemented.');
    }

    handle(): string {
        throw new Error('Method not implemented.');
    }
}
