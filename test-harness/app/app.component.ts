import { Component } from '@angular/core';
import { firstValueFrom, from, lastValueFrom } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';
import { BluetoothHelper, GattService, getCharacteristicName, getInstance, getServiceName } from '../../src';

type Characteristic = {
    displayName: string;
    serviceName: string;
    gatt: BluetoothRemoteGATTCharacteristic;
    notifyValues?: string | number[];
    readValues?: string | number[];
};

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
})
export class AppComponent {
    private helper: BluetoothHelper;
    constructor() {
        this.helper = getInstance();
    }

    private readonly textDecoder = new TextDecoder();

    private _device: BluetoothDevice | undefined;

    public get device(): BluetoothDevice | undefined {
        return this._device;
    }

    private _errorMessage: string | undefined;

    public get errorMessage(): string | undefined {
        return this._errorMessage;
    }

    private _deviceRequested = false;

    public get deviceRequested(): boolean {
        return this._deviceRequested;
    }

    public serviceName = 'Heart Rate';

    public async requestDevice() {
        this._errorMessage = undefined;
        const service = GattService[this.serviceName as keyof typeof GattService];

        if (service == null) {
            this._errorMessage = `'${this.serviceName}' is not a valid service name`;
            return;
        }

        this._deviceRequested = true;

        const device = await lastValueFrom(
            this.helper.requestDevice({
                filters: [{ services: [GattService['Heart Rate']] }],
                optionalServices: [
                    GattService.Battery,
                    GattService['Generic Access'],
                    GattService['Generic Attribute'],
                    GattService['Device Information'],
                ],
            }),
        );

        if (device == null) {
            console.log(`User cancelled device selection`);
            this._deviceRequested = false;
            return;
        }

        this._device = device;

        this.loadServices(this._device);
    }

    private _connected = false;

    public get connected(): boolean {
        return this._connected;
    }

    private _characteristics: Characteristic[] | undefined;

    public get characteristics(): Characteristic[] | undefined {
        return this._characteristics;
    }

    public async readCharacteristic(characteristic: Characteristic) {
        const value = await characteristic.gatt.readValue();

        characteristic.readValues = this.convertDataView(value);
    }

    public async notifyCharacteristic(characteristic: Characteristic) {
        this.helper
            .getNotifications(characteristic.gatt)
            .subscribe((value) => (characteristic.notifyValues = this.convertDataView(value)));
    }

    private convertDataView(view: DataView): number[] | string {
        const validString = /\w/;
        const stringAttempt = this.textDecoder.decode(view);

        if (validString.test(stringAttempt)) {
            return stringAttempt;
        }

        const byteValues: number[] = [];

        for (let i = 0; i < view.byteLength; i++) {
            byteValues.push(view.getUint8(i));
        }

        return byteValues;
    }

    private async loadServices(device: BluetoothDevice) {
        const gattServer = await firstValueFrom(this.helper.connectServer(device));

        this._connected = true;

        const services = await firstValueFrom(this.helper.getServices(gattServer));

        const characteristics = await lastValueFrom(
            from(services).pipe(
                mergeMap((service) => this.helper.getCharacteristics(gattServer, service)),
                toArray(),
            ),
        );

        this._characteristics = characteristics
            .reduce((all, current) => [...all, ...current], new Array<BluetoothRemoteGATTCharacteristic>())
            .map((gatt) => ({
                gatt,
                displayName: getCharacteristicName(gatt.uuid),
                serviceName: getServiceName(gatt.service.uuid),
            }));
    }
}
