import { Component } from '@angular/core';
import { firstValueFrom, from, lastValueFrom } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';
import {
    BluetoothHelper,
    GattCharacteristic,
    GattCharacteristicId,
    GattServiceId,
    getCharacteristicName,
    getServiceName,
    getServices,
    isDataView,
} from '../../src';

type Characteristic = {
    id: GattCharacteristicId;
    displayName: string;
    serviceName: string;
    gatt: BluetoothRemoteGATTCharacteristic;
    notifyValues?: unknown;
    readValues?: unknown;
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
        const value = await this.helper.readValue(characteristic);

        characteristic.readValues = this.convertDataView(value);
    }

    public async notifyCharacteristic(characteristic: Characteristic) {
        this.helper
            .getNotifications(characteristic)
            .subscribe((value) => (characteristic.notifyValues = this.convertDataView(value)));
    }

    private convertDataView(value: unknown): unknown {
        if (isDataView(value)) {
            const byteValues: number[] = [];

            for (let i = 0; i < value.byteLength; i++) {
                byteValues.push(value.getUint8(i));
            }

            return byteValues;
        }

        return value;
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
                ...characteristic,
                serviceName: getServiceName(characteristic.gatt.service.uuid),
                displayName: getCharacteristicName(characteristic.gatt.uuid),
            }));
    }
}
