export function isDataView(value: unknown): value is DataView {
    return value != null && (value as DataView).buffer instanceof ArrayBuffer;
}
