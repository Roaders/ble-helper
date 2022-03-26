# ble-helper

Helps to help connecting to Bluetooth devices

## Test Harness

The test harness can be seen running [here](https://roaders.github.io/ble-helper/) where you can try connecting to your bluetooth devices.

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

`reflect-metadata` will need to be installed and imported for this to work. See [needle docs](https://github.com/morganstanley/needle#polyfills) for more details.

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

`reflect-metadata` will need to be installed and imported for this to work. See [needle docs](https://github.com/morganstanley/needle#polyfills) for more details.

## Usage

```typescript
import { getInstance, GattServiceId } from 'ble-helper';
import { firstValueFrom } from 'rxjs';

const helper = getInstance();

async function getHeartRateUpdates() {
    // request device. This will open a dialog in the browser where the user will pick the device.
    // Specify an array of what services you want.
    const device = await firstValueFrom(
        helper.requestDevice({
            filters: [{ services: [GattServiceId['Heart Rate']] }], // requests any heart rate devices
            optionalServices: [GattServiceId['Battery'], GattServiceId['Device Information']], // allows us to access other services on the same device like battery level and device name
        }),
    );

    if (device == null) {
        // User cancelled the dialog, no device selected.
        return;
    }

    // Connect to server
    const server = await firstValueFrom(helper.connectServer(device));

    // Request the service we are interested from server
    const service = await firstValueFrom(helper.getService(server, 'Battery'));

    if (service == null) {
        // could not find specified service
        return;
    }

    // Request characteristic we are interested in from service
    const characteristic = await firstValueFrom(helper.getCharacteristic(server, service.gatt, 'Battery Level'));

    if (characteristic == null) {
        // could not find specified characteristic
        return;
    }

    const initialValue = await helper.readValue(characteristic);

    console.log(`Initial battery level: ${initialValue}`);

    // Subscribe to be notified of these values changing
    helper.getNotifications(characteristic).subscribe((value) => {
        console.log(`Battery level is: ${value}`);
    });
}
```
`BluetoothHelper` returns observables but I've used async above to make it a bit clearer what is going on.

The above example uses one of the default conversion strategies that are included with `ble-helper`. Any characteristics that do not have registered strategies will just return a `DataView` object when reading or subscribing to updates.

## Strategies

By default the following characteristic conversion strategies are provided:

 * Battery Level
 * Manufacturer Name String
 * Model Number String
 * Serial Number String
 * Hardware Revision String
 * Firmware Revision String
 * Software Revision String
 * Device Name

To covert `DataView` objects for other characteristics new strategies must be provided to handle them:

```ts
class HeartRateConversionStrategy implements ICharacteristicConversionStrategy<'Heart Rate Measurement', number> {
    public name = 'Heart Rate Measurement' as const;

    canHandle(characteristic: GattCharacteristic<'Heart Rate Measurement'>): boolean {
        return characteristic.name === this.name;
    }

    convert(_characteristic: GattCharacteristic<'Heart Rate Measurement'>, value: DataView): number {
        const hearRate: number = paraseHeartRate(value); // To Be Implemented

        return hearRate;
    }
}
```

any strategies that you create must then be passed to the `BluetoothHelper` by using the `BluetoothHelperFactory`:

```ts
const factory: BlueToothHelperFactory = get(BlueToothHelperFactory);

const helper = factory.createWithStrategies(tuple(new HeartRateConversionStrategy()));
```

in this case `helper.readValue()` will return a value typed as a number as this is what the strategy returns. 

## Notes

ALthough `Angular` is included in this project this is only for the test harness. There are no angular dependencies when consuming this project.
