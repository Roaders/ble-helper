import { Injectable } from '@morgan-stanley/needle';
import { BaseNumericValueConversionStrategy } from './base.conversion.strategy';

@Injectable()
export class BatteryLevelStrategy extends BaseNumericValueConversionStrategy<'Battery Level'> {
    constructor() {
        super('Battery Level', 8);
    }
}
