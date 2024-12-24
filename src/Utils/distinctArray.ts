export type DistinctArray<T> = {
    id: (value: T) => number;
    distinct: T[];
    array: T[];
}

export namespace DistinctArray {
    export function Create<T>(id: (value: T) => number): DistinctArray<T> {
        return {
            id,
            distinct: [],
            array: [] as T[]
        };
    }

    export function Push<T>({ id, distinct, array }: DistinctArray<T>, value: T) {
        const vId = id(value);

        if(distinct[vId] === undefined) {
            distinct[vId] = value;
            array.push(value);
        }
    }

    export function Get<T>({ array }: DistinctArray<T>) {
        return array;
    }
}