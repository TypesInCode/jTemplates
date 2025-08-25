export type DistinctArray<T> = {
    id: (value: T) => number;
    distinct: Array<true | undefined> | null;
    array: T[];
}

export namespace DistinctArray {
    export function Create<T>(id: (value: T) => number): DistinctArray<T> {
        return {
            id,
            distinct: null,
            array: [] as T[]
        };
    }

    export function Push<T>(distinctArr: DistinctArray<T>, value: T) {

        const{ id, array }: DistinctArray<T> = distinctArr;
        switch(array.length) {
            case 0:
                array.push(value);
                break;
            case 1: {
                if(distinctArr.distinct === null) {
                    distinctArr.distinct = []
                    distinctArr.distinct[id(array[0])] = true;
                }
            }
            default: {
                const vId = id(value);
                if(distinctArr.distinct[vId] === undefined) {
                    distinctArr.distinct[vId] = true;
                    array.push(value);
                }
            }
        }
    }

    export function Get<T>({ array }: DistinctArray<T>) {
        return array;
    }
}
