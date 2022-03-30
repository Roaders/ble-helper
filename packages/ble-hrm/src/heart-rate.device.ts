import { Injectable } from '@morgan-stanley/needle';
import { BluetoothHelper, GattServiceId } from 'ble-helper';
import { merge, Observable, of } from 'rxjs';
import { filter, map, mergeMap, share, switchMap, tap } from 'rxjs/operators';
import { HeartRateResult } from './contracts';
import { parseHeartRate } from './heart-rate-helper';
import { isDefined } from './type-guards';

@Injectable()
export class HeartRateDevice {
    constructor(private helper: BluetoothHelper) {}

    public connect(connectionRetries = 5): Observable<HeartRateResult> {
        return this.helper
            .requestDevice({
                filters: [{ services: [GattServiceId['Heart Rate']] }],
                optionalServices: [GattServiceId['Battery'], GattServiceId['Device Information']],
            })
            .pipe(
                filter(isDefined),
                mergeMap((device) => this.subscribeToUpdates(device, connectionRetries).pipe(share())),
            );
    }

    private subscribeToUpdates(device: BluetoothDevice, connectionRetries: number): Observable<HeartRateResult> {
        let retries = 0;

        return merge(of(device), this.helper.createDeviceDisconnectionStream(device)).pipe(
            filter(() => retries++ < connectionRetries),
            switchMap((device) => this.helper.connectServer(device)),
            switchMap((server) =>
                this.helper.getService(server, 'Heart Rate').pipe(
                    filter(isDefined),
                    switchMap((service) =>
                        this.helper.getCharacteristic(server, service.gatt, 'Heart Rate Measurement'),
                    ),
                ),
            ),
            filter(isDefined),
            switchMap((characteristic) => this.helper.getNotifications(characteristic)),
            tap(() => (retries = 0)),
            map((data) => parseHeartRate(data)),
        );
    }
}
