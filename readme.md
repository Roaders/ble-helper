# ble-helper

Helps to help connecting to Bluetooth devices

## Installation

```
npm install ble-helper
```

If you are working in typescript you will most likely also need the `web-bluetooth` types as well:

```
npm install @types/web-bluetooth -D
```

## Construction

### Direct Construction

```typescript
import { BluetoothHelper, Logger } from "ble-helper";

const bluetoothHelper = new BluetoothHelper(new Logger());
```
using this method you can replace `Logger` with your own logging implementation;

### Construction with `getInstance()`:

```typescript
import { getInstance } from "ble-helper";

const bluetoothHelper = getInstance();
```

### Constructor Injection

`BluetoothHelper` is decorated so metadata about it's constructor parameters is recorded so you can use it in IOC environments:

```typescript
@Injectable()
class MyClass{
    constructor(private helper: BluetoothHelper){

    }
}
```

to use in angular you can hook up the [needle](https://github.com/MorganStanley/needle) registry with angular to allow seamless injection into angular components:

`main.ts:`
```typescript
import { getRegisteredTypesWithFactories } from '@morgan-stanley/needle';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

platformBrowserDynamic(getRegisteredTypesWithFactories())
    .bootstrapModule(AppModule)
    .catch((err) => console.error(err));
```

## Usage

```typescript
import { getInstance, GattService, GattCharacteristic } from "ble-helper";

const helper = getInstance();

async function getHeartRateUpdates() {
    // request device. This will open a dialog in the browser where the user will pick the device.
    // Specify an array of what services you want.
    const device = await firstValueFrom(helper.requestDevice([GattService['Heart Rate']]));

    if (device == null) {
        // User cancelled the dialog, no device selected.
        return;
    }

    // Connect to server
    const server = await firstValueFrom(helper.connectServer(device));

    // Request the service we are interested from server
    const service = await firstValueFrom(helper.getService(server, GattService['Heart Rate']));

    // Request characteristic we are interested in from service
    const characteristic = await firstValueFrom(
        helper.getCharacteristic(server, service, GattCharacteristic['Heart Rate Measurement']),
    );

    // Subscribe to be notified of these values changing
    helper.getNotifications(characteristic).subscribe((value) => {
        console.log(parseValue(value));
    });
}
```
`BluetoothHelper` returns observables but I've used async above to make it a bit clearer what is going on.

If you want to connect to multiple different services on your device these services must be passed as `optionalServices` in a `RequestDeviceOptions` object:

```typescript
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
```

The `parseValue` function will need to be written for each different BLuetooth characteristic based on the documents [here](https://www.bluetooth.com/specifications/specs/).
