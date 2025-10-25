export type DistinctArray<T> = {
  id: (value: T) => unknown;
  distinct: Set<unknown> | null;
  array: T[];
};

export namespace DistinctArray {
  export function Create<T>(
    id: (value: T) => unknown = (val: T) => val,
  ): DistinctArray<T> {
    return {
      id,
      distinct: null,
      array: [] as T[],
    };
  }

  export function Push<T>(distinctArr: DistinctArray<T>, value: T) {
    switch (distinctArr.array.length) {
      case 0:
        distinctArr.array.push(value);
        break;
      case 1: {
        if (distinctArr.distinct === null) {
          distinctArr.distinct = new Set([
            distinctArr.id(distinctArr.array[0]),
          ]);
        }
      }
      default: {
        const vId = distinctArr.id(value);
        if (!distinctArr.distinct.has(vId)) {
          distinctArr.distinct.add(vId);
          distinctArr.array.push(value);
        }
      }
    }
  }

  export function Get<T>({ array }: DistinctArray<T>) {
    return array;
  }

  export function Size<T>(distinct: DistinctArray<T>) {
    return distinct.distinct.size;
  }

  export function Clear<T>(distinct: DistinctArray<T>) {
    distinct.array = [];
    distinct.distinct?.clear();
  }
}
