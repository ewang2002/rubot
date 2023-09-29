export interface WaitzLiveData {
    data: LocationLiveInfo[];
}

export interface LocationLiveInfo {
    // The name of the location.
    name: string;
    // The location ID.
    id: number;
    // How busy the place is. Looks like a percentage value.
    busyness: number;
    // Number of people at said place.
    people: number;
    // Whether the place is available.
    isAvailable: boolean;
    // Maximum number of people allowed at this location.
    capacity: number;
    // Information about whether the location is open or not
    // - "open" = currently open.
    // - "Partially Open" = partially open.
    // - "Closed until XXX" = closed.
    hourSummary: string;
    // Whether the location is open or partially open.
    isOpen: boolean;
    // Percent occupied (basically just busyness / 100).
    percentage: number;
    // Locations within this location, or `false` if none exist.
    subLocs: Omit<LocationLiveInfo, "subLocs">[] | false;
}

export interface WaitzCompareData {
    data: LocationCompareInfo[];
}

export interface LocationCompareInfo {
    id: number;
    name: string;
    comparison: ComparisonInfo[] | null;
    open: boolean;
    trendHtml: string;
}

export interface ComparisonInfo {
    valid: boolean;
    value?: string[] | null | string;
    trend: string;
    string?: string;
}
