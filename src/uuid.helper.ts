import { GattCharacteristic, GattService } from './constants';

/**
 * looks up a service UUID and returns it's name if it's known
 * @param uuid
 * @returns string
 */
export function getServiceName(uuid: BluetoothServiceUUID): string {
    return lookupEnumName(uuid, GattService, 'service name');
}

/**
 * looks up a characteristic UUID and returns it's name if it's known
 * @param uuid
 * @returns string
 */
export function getCharacteristicName(uuid: BluetoothCharacteristicUUID): string {
    return lookupEnumName(uuid, GattCharacteristic, 'service name');
}

function lookupEnumName(uuid: number | string, lookup: Record<number, string>, description: string): string {
    if (typeof uuid == 'string') {
        const components = uuid.split('-');

        uuid = parseInt(components[0], 16);
    }

    const name = lookup[uuid];

    if (name == null) {
        throw new Error(`Could not resolve ${description} for '${uuid}'`);
    }

    return name;
}
