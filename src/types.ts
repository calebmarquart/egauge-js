export interface RegisterResponse {
    ts: string;
    registers: {
        name: string;
        type: string;
        idx: number;
        did: number;
        rate?: number;
    }[];
    ranges: {
        ts: string;
        delta: number;
        rows: string[];
    }[];
}

export interface EpochResponse {
    result: string;
}

export interface DeviceConfig {
    eGaugeId: string;
    auth: {
        username: string;
        password: string;
    };
}
