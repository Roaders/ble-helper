/**
 * type-guarrd to chack that the value returned is a type guard
 * @param value
 * @returns
 */
export function isDataView(value: unknown): value is DataView {
    return value != null && (value as DataView).buffer instanceof ArrayBuffer;
}

export function isNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value);
}
