import { Component } from '@angular/core';
import { HeartRateDevice, HeartRateResult } from '../../src';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
})
export class AppComponent {
    constructor(private hrDevice: HeartRateDevice) {}

    private _result: HeartRateResult | undefined;

    public get result(): HeartRateResult | undefined {
        return this._result;
    }

    private _connected = false;

    public get connected(): boolean {
        return this._connected;
    }

    public connect() {
        this._connected = true;

        this.hrDevice.connect().subscribe((value) => (this._result = value));
    }
}
