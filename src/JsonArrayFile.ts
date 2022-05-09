import * as fs from "fs";

export type Operation<T> = (data: T[]) => T[];

/**
 * A class that represents a JSON file containing only an *array of objects*. This class can be used
 * to safely perform IO operations on a JSON file without the possibility of race conditions.
 * This is primarily done by enforcing a queue in which each operation is performed on the JSON
 * file.
 *
 * Note that this class should not be used as a substitute for a database. Due to the nature of
 * the queue system, writing to a JSON file may take some time (usually a second when there's
 * nothing in queue, but a longer time if there are many things in queue).
 *
 * Reading from a JSON file can be performed without issue. In particular, the array of objects from
 * the JSON file is cached.
 */
export class JsonArrayFile<T> {
    private readonly _jsonPath: string;
    private _cached: T[];

    // The queue for which write operations are controlled.
    private _queue: {
        // The operation to perform on the current data.
        operation: Operation<T>;
        // The promise resolver.
        resolver: (value: (boolean | PromiseLike<boolean>)) => void;
    }[];

    /**
     * Creates a new `JsonArrayFile` object with the specified path and initial data, if any.
     * @param {string} path The path to the JSON file.
     * @param {T[]} initData The initial data, if any.
     */
    public constructor(path: string, initData: T[] = []) {
        this._jsonPath = path;
        if (!fs.existsSync(path)) {
            fs.writeFileSync(path, JSON.stringify(initData));
        }

        this._cached = JSON.parse(fs.readFileSync(path).toString());
        this._queue = [];

        setInterval(async () => {
            if (this._queue.length === 0) {
                return;
            }

            const {operation, resolver} = this._queue.shift()!;
            this._cached = operation(this._cached);
            await fs.promises.writeFile(this._jsonPath, JSON.stringify(this._cached));
            resolver(true);
        }, 500);
    }

    /**
     * Runs an operation on the JSON file. You can use this to, for example, add or remove elements
     * from the JSON file.
     * @param {Operation<T>} operation The operation.
     * @returns {Promise<boolean>} The result of the operation.
     */
    public runOperation(operation: Operation<T>): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            this._queue.push({
                operation,
                resolver: resolve
            });
        });
    }

    /**
     * Gets the currently cached data. Note that this merely returns a reference to the current
     * cached data. You should only use this method to view the data. If you need to make any
     * changes, please use `JsonArrayFile#runOperation` instead.
     * @returns {T[]} The cached data.
     */
    public getCachedData(): readonly T[] {
        return this._cached;
    }
}