import { Component } from '@angular/core';
import { firstValueFrom, from, lastValueFrom } from 'rxjs';
import { mergeMap, take, tap, toArray } from 'rxjs/operators';
import { BluetoothHelper } from '../../src';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
})
export class AppComponent {
    constructor(private helper: BluetoothHelper) {}

    private _device: BluetoothDevice | undefined;

    public get device(): BluetoothDevice | undefined {
        return this._device;
    }

    private _deviceRequested = false;

    public get deviceRequested(): boolean {
        return this._deviceRequested;
    }

    public serviceName = 'heart_rate';

    public requestDevice() {
        this._deviceRequested = true;
        this.helper.requestDevice([this.serviceName], 5).subscribe((device) => {
            this._device = device;

            this.loadServices(device);
        });
    }

    private _connected = false;

    public get connected(): boolean {
        return this._connected;
    }

    private _characteristics: BluetoothRemoteGATTCharacteristic[] | undefined;

    public get characteristics(): BluetoothRemoteGATTCharacteristic[] | undefined {
        return this._characteristics;
    }

    private async loadServices(device: BluetoothDevice) {
        const gattServer = await firstValueFrom(this.helper.connectServer(device));

        this._connected = true;

        const services = await firstValueFrom(this.helper.getServices(gattServer));

        console.log(`SERVICES: ${services.map((s) => s.uuid)}`);

        const characteristics = await lastValueFrom(
            from(services).pipe(
                mergeMap((service) => this.helper.getCharacteristics(gattServer, service)),
                toArray(),
            ),
        );

        console.log(`Characteristics retrieved: `, characteristics);

        this._characteristics = characteristics.reduce(
            (all, current) => [...all, ...current],
            new Array<BluetoothRemoteGATTCharacteristic>(),
        );

        this._characteristics.forEach((char) =>
            console.log(`Characteristic: ${char.uuid}, service: ${char.service.uuid}`),
        );
    }
}
