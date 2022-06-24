export interface OneBusAwayData {
    header: Header;
    entity: Entity[];
}

export interface Entity {
    id: string;
    tripUpdate: TripUpdate;
}

export interface TripUpdate {
    trip: Trip;
    stopTimeUpdate: StopTimeUpdate[];
    vehicle: Vehicle;
    timestamp: string;
    delay?: number;
}

export interface StopTimeUpdate {
    arrival?: Arrival;
    departure: Arrival;
    stopId: string;
}

export interface Arrival {
    time?: string;
}

export interface Trip {
    tripId: string;
    routeId: string;
}

export interface Vehicle {
    id: string;
}

export interface Header {
    gtfsRealtimeVersion: string;
    timestamp: string;
}