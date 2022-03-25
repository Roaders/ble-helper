import { StrategyList } from './contracts';

enum SomeEnumIds {
    nameOne = 0,
    nameTwo = 1,
    nameThree = 2,
    nameFour = 3,
}

export type EnumNames = keyof typeof SomeEnumIds;

export type Input<T extends EnumNames> = {
    inputType: T;
};

export interface ConversionStrategy<T extends EnumNames = EnumNames, R = unknown> {
    convert(input: Input<T>): R;
}

const strategyOne = {} as ConversionStrategy<'nameOne', string>;
const strategyTwo = {} as ConversionStrategy<'nameTwo', number>;

// const strategies: [ConversionStrategy<'nameOne', string>, ConversionStrategy<'nameTwo', number>] = [
//     strategyOne,
//     strategyTwo,
// ];

const strategies = [strategyOne, strategyTwo] as const;

type StrategyReturnType<TLookup extends StrategyList, T extends EnumNames> = ((...xs: TLookup) => unknown) extends (
    h: infer Head,
    ...ts: infer Tail
) => unknown
    ? ((h: Head) => unknown) extends (h: ConversionStrategy<T, infer R>) => unknown
        ? R
        : ((h: unknown, ...ts: unknown[]) => unknown) extends (h: Head, ...tail: Tail) => unknown
        ? StrategyReturnType<Tail, T>
        : Date
    : boolean;

class SomeClass<TypeLookup extends StrategyList> {
    constructor(_lookup: TypeLookup) {
        console.log(`Constructing`);
    }

    getValue<T extends EnumNames>(_name: T): StrategyReturnType<TypeLookup, T> {
        return {} as StrategyReturnType<TypeLookup, T>;
    }
}

const classInstance = new SomeClass(strategies); // this should be a compile error as EnumValuesThree contains invalid property names

const resultOne: string = classInstance.getValue('nameOne'); // should be typed as string
const resultTwo: number = classInstance.getValue('nameTwo'); // should be typed as number
const resultThree = classInstance.getValue('nameThree'); // should be typed as number

console.log({ resultOne, resultTwo, resultThree });
