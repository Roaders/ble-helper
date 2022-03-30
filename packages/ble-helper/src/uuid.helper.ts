import { GattCharacteristicId, GattServiceId } from './constants';

/**
 * looks up a service UUID and returns it's name if it's known
 * @param uuid
 * @returns string
 */
export function getServiceName(uuid: BluetoothServiceUUID): string {
    return lookupEnumName(uuid, GattServiceId, 'service name');
}

/**
 * looks up a characteristic UUID and returns it's name if it's known
 * @param uuid
 * @returns string
 */
export function getCharacteristicName(uuid: BluetoothCharacteristicUUID): string {
    return lookupEnumName(uuid, GattCharacteristicId, 'service name');
}

export function extract16Bit(uuid: string): number {
    const components = uuid.split('-');

    return parseInt(components[0], 16);
}

function lookupEnumName(
    uuid: number | string,
    lookup: Record<number, string | undefined>,
    description: string,
): string {
    if (typeof uuid == 'string') {
        uuid = extract16Bit(uuid);
    }

    const name = lookup[uuid];

    if (name == null) {
        throw new Error(`Could not resolve ${description} for '${uuid}'`);
    }

    return name;
}
