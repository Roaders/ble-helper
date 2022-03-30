import { GattCharacteristicName } from '../constants';
import { GattCharacteristic, ICharacteristicConversionStrategy } from '../contracts';

export abstract class BaseStringValueConversionStrategy<T extends GattCharacteristicName>
    implements ICharacteristicConversionStrategy<T, string>
{
    private decoder: TextDecoder = new TextDecoder();

    constructor(public readonly name: T) {}

    canHandle(characteristic: GattCharacteristic): boolean {
        return characteristic.name === this.name;
    }

    convert(_characteristic: GattCharacteristic, value: DataView): string {
        return this.decoder.decode(value);
    }
}

export abstract class BaseNumericValueConversionStrategy<T extends GattCharacteristicName>
    implements ICharacteristicConversionStrategy<T, number>
{
    constructor(public readonly name: T, private bytes: 8 | 16 | 32) {}

    canHandle(characteristic: GattCharacteristic): boolean {
        return characteristic.name === this.name;
    }

    convert(_characteristic: GattCharacteristic, value: DataView): number {
        switch (this.bytes) {
            case 8:
                return value.getUint8(0);
            case 16:
                return value.getUint16(0);
            case 32:
                return value.getUint32(0);
        }
    }
}
