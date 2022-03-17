import { Component } from '@angular/core';
import { firstValueFrom, from, lastValueFrom } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';
import { BluetoothHelper, GattService, getCharacteristicName, getServiceName } from '../../src';

type Characteristic = {
    displayName: string;
    serviceName: string;
    gatt: BluetoothRemoteGATTCharacteristic;
    notifyValues?: number[];
    readValues?: number[];
};

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
})
export class AppComponent {
    constructor(private helper: BluetoothHelper) {}

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

    public requestDevice() {
        this._errorMessage = undefined;
        const service = GattService[this.serviceName as any];

        if (service == null) {
            this._errorMessage = `'${this.serviceName}' is not a valid service name`;
            return;
        }

        this._deviceRequested = true;
        this.helper.requestDevice([service], 5).subscribe((device) => {
            this._device = device;

            this.loadServices(device);
        });
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
        console.log(`Reading ${characteristic.displayName}`);
        const value = await characteristic.gatt.readValue();

        characteristic.readValues = this.convertDataView(value);
    }

    public async notifyCharacteristic(characteristic: Characteristic) {
        console.log(`Reading ${characteristic.displayName}`);
        const gattCharacteristic = await characteristic.gatt.startNotifications();

        gattCharacteristic.addEventListener(
            'characteristicvaluechanged',
            () =>
                (characteristic.notifyValues =
                    gattCharacteristic.value != null ? this.convertDataView(gattCharacteristic.value) : []),
        );
    }

    private convertDataView(view: DataView): number[] {
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

        console.log(`Characteristics retrieved: `, characteristics);

        this._characteristics = characteristics
            .reduce((all, current) => [...all, ...current], new Array<BluetoothRemoteGATTCharacteristic>())
            .map((gatt) => ({
                gatt,
                displayName: getCharacteristicName(gatt.uuid),
                serviceName: getServiceName(gatt.service.uuid),
            }));
    }
}
