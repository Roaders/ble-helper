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

const strategies = [strategyOne, strategyTwo] as const;

//type StrategyReturnType<TLookup extends readonly [...ConversionStrategy[]], T extends EnumNames> = TLookup[0] extends ConversionStrategy<T, infer R> ? R : unknown;
type StrategyReturnType<TLookup extends Array<unknown> | ReadonlyArray<unknown>, T extends EnumNames> = ((
    ...xs: TLookup
) => unknown) extends (h: infer Head, ...ts: infer Tail) => unknown
    ? ((h: Head) => unknown) extends (h: ConversionStrategy<T, infer R>) => unknown
        ? R
        : ((h: Head, ...ts: Tail) => unknown) extends (h: unknown, ...tail: unknown[]) => unknown
        ? StrategyReturnType<Tail, T>
        : Date
    : boolean;

class SomeClass<TypeLookup extends ConversionStrategy[] | ReadonlyArray<ConversionStrategy>> {
    constructor(_lookup: TypeLookup) {
        console.log(`Constructing`);
    }

    getValue<T extends EnumNames>(_name: T): StrategyReturnType<TypeLookup, T> {
        return {} as StrategyReturnType<TypeLookup, T>;
    }
}

const classInstance = new SomeClass(strategies); // this should be a compile error as EnumValuesThree contains invalid property names

const resultOne = classInstance.getValue('nameOne'); // should be typed as string
const resultTwo = classInstance.getValue('nameTwo'); // should be typed as number
const resultThree = classInstance.getValue('nameThree'); // should be typed as number

console.log({ resultOne, resultTwo, resultThree });
