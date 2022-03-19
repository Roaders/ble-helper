import { Component } from '@angular/core';
import { firstValueFrom, from, lastValueFrom } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';
import { BluetoothHelper, GattCharacteristic, GattServiceId, getServiceName, getServices } from '../../src';

type Characteristic = {
    displayName?: string;
    serviceName?: string;
    gatt: BluetoothRemoteGATTCharacteristic;
    notifyValues?: string | number[];
    readValues?: string | number[];
};

const defaultOptionalServices = [
    GattServiceId.Battery,
    GattServiceId['Generic Access'],
    GattServiceId['Generic Attribute'],
    GattServiceId['Device Information'],
];

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
})
export class AppComponent {
    constructor(private helper: BluetoothHelper) {}

    public readonly services = getServices();

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

    public selectedService = this.services.find((service) => service.display === 'Heart Rate');

    public optionalServices = this.services.filter((service) =>
        defaultOptionalServices.some((defaultService) => service.value === defaultService),
    );

    public async requestDevice() {
        this._errorMessage = undefined;

        if (this.selectedService == null) {
            this._errorMessage = `Service must be selected`;
            return;
        }

        this._deviceRequested = true;

        console.log(`Requesting`, { selectedService: this.selectedService, optionalServices: this.optionalServices });

        const device = await lastValueFrom(
            this.helper.requestDevice({
                filters: [{ services: [this.selectedService.value] }],
                optionalServices: this.optionalServices.map((service) => service.value),
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
                mergeMap((service) => this.helper.getCharacteristics(gattServer, service.gatt)),
                toArray(),
            ),
        );

        this._characteristics = characteristics
            .reduce((all, current) => [...all, ...current], new Array<GattCharacteristic>())
            .map((characteristic) => ({
                gatt: characteristic.gatt,
                displayName: characteristic.name,
                serviceName: getServiceName(characteristic.gatt.service.uuid),
            }));
    }
}
