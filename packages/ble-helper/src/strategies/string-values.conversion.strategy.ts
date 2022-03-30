import { Injectable } from '@morgan-stanley/needle';
import { BaseStringValueConversionStrategy } from './base.conversion.strategy';

@Injectable()
export class ManufacturerNameStrategy extends BaseStringValueConversionStrategy<'Manufacturer Name String'> {
    constructor() {
        super('Manufacturer Name String');
    }
}

@Injectable()
export class ModelNumberStrategy extends BaseStringValueConversionStrategy<'Model Number String'> {
    constructor() {
        super('Model Number String');
    }
}

@Injectable()
export class SerialNumberStrategy extends BaseStringValueConversionStrategy<'Serial Number String'> {
    constructor() {
        super('Serial Number String');
    }
}

@Injectable()
export class HardwareRevisionStrategy extends BaseStringValueConversionStrategy<'Hardware Revision String'> {
    constructor() {
        super('Hardware Revision String');
    }
}

@Injectable()
export class FirmwareRevisionStrategy extends BaseStringValueConversionStrategy<'Firmware Revision String'> {
    constructor() {
        super('Firmware Revision String');
    }
}

@Injectable()
export class SoftwareRevisionStrategy extends BaseStringValueConversionStrategy<'Software Revision String'> {
    constructor() {
        super('Software Revision String');
    }
}

@Injectable()
export class DeviceNameStrategy extends BaseStringValueConversionStrategy<'Device Name'> {
    constructor() {
        super('Device Name');
    }
}
