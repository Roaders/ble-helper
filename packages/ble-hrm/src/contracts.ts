export type HeartRateResult = {
    timestamp: number;
    heartRate: number;
    contactDetected?: boolean;
    energyExpended?: number;
    rrIntervals?: number[];
};
