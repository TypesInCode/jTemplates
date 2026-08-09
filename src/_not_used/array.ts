/**
 * Removes all null values from an array starting from a specified index.
 * This function modifies the array in-place by shifting non-null elements
 * to fill the gaps left by removed null values, then truncating the array.
 *
 * @param array - The array from which to remove null values. Can contain mixed types including null.
 * @param startIndex - The index to start removing null values from (default: 0).
 *
 * @example
 * ```typescript
 * const arr = [1, null, 2, null, 3, null, 4];
 * RemoveNulls(arr); // Removes all null values, result: [1, 2, 3, 4]
 *
 * const arr2 = [null, null, 1, null, 2];
 * RemoveNulls(arr2, 2); // Starts from index 2, result: [null, null, 1, 2]
 * ```
 */
export function RemoveNulls(array: (unknown | null)[], startIndex = 0) {
  let nullIndex = startIndex;
  for (; nullIndex < array.length && array[nullIndex] !== null; nullIndex++) {}
  let notNullIndex = nullIndex + 1;

  for (
    ;
    notNullIndex < array.length && array[notNullIndex] === null;
    notNullIndex++
  ) {}

  while (notNullIndex < array.length) {
    array[nullIndex] = array[notNullIndex];
    nullIndex++;
    notNullIndex++;

    for (
      ;
      notNullIndex < array.length && array[notNullIndex] === null;
      notNullIndex++
    ) {}
  }

  array.splice(nullIndex);
}

export function ArrayDiff(source: any[], target: any[]) {
  if (source === target) return false;

  if (!source || !target || source.length !== target.length) return true;

  let x = 0;
  for (; x < source.length && source[x] === target[x]; x++) {}

  return x < source.length;
}

/**
 * Reconciles two sorted arrays by applying add and remove operations to transition
 * from the left array to the right array. Elements are compared based on their first
 * element (index 0) which must be a number.
 *
 * This function efficiently handles the process of updating a sorted collection by:
 * - Removing elements that exist in the left array but not in the right array
 * - Adding elements that exist in the right array but not in the left array
 *
 * @template T - A tuple type where the first element is a number (T extends [number])
 * @param left - The initial sorted array of tuples
 * @param right - The target sorted array of tuples
 * @param add - Callback function to handle adding elements
 * @param remove - Callback function to handle removing elements
 *
 * @example
 * ```typescript
 * const left = [[1, 'a'], [3, 'c']];
 * const right = [[2, 'b'], [3, 'c'], [4, 'd']];
 * const added: number[] = [];
 * const removed: number[] = [];
 *
 * ReconcileSortedEmitters(
 *   left,
 *   right,
 *   (value) => added.push(value[0]),
 *   (value) => removed.push(value[0])
 * );
 * // Adds [2, 4] and removes [1]
 * ```
 */
export function ReconcileSortedEmitters<T extends [number]>(
  left: T[],
  right: T[],
  add: (value: T) => void,
  remove: (value: T) => void,
) {
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    let li = leftIndex;
    let ri = rightIndex;

    for (; li < left.length && left[li][0] < right[ri][0]; li++)
      remove(left[li]);

    while (
      li < left.length &&
      ri < right.length &&
      left[li][0] === right[ri][0]
    ) {
      li++;
      ri++;
    }

    for (
      ;
      ri < right.length && li < left.length && right[ri][0] < left[li][0];
      ri++
    )
      add(right[ri]);

    leftIndex = li;
    rightIndex = ri;
  }

  for (let li = leftIndex; li < left.length; li++) remove(left[li]);

  for (let ri = rightIndex; ri < right.length; ri++) add(right[ri]);
}

export function InsertionSortTuples<T extends [number, ...any[]]>(
  arr: T[],
): T[] {
  const n = arr.length;

  // Start from the second element (index 1) as the first element (index 0)
  // is trivially sorted by itself.
  for (let i = 1; i < n; i++) {
    // Pick up the current element to be inserted
    const currentItem = arr[i];

    // This is the index of the last element in the sorted sub-array
    let j = i - 1;

    // Move elements of the sorted sub-array that are greater than currentItem,
    // to one position ahead of their current position.
    // We compare using the first element of the tuples (currentItem[0]).
    while (j >= 0 && arr[j][0] > currentItem[0]) {
      arr[j + 1] = arr[j];
      j--;
    }

    // Place the currentItem in its correct position in the sorted sub-array
    arr[j + 1] = currentItem;
  }

  return arr;
}

export function ReconcileSortedArrays<T>(
  left: T[],
  right: T[],
  add: (value: T) => void,
  remove: (value: T) => void,
) {
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    let y = rightIndex;

    for (; y < right.length && left[leftIndex] !== right[y]; y++) {}

    if (y === right.length) remove(left[leftIndex]);
    else {
      for (let z = rightIndex; z < y; z++) add(right[z]);

      rightIndex = y + 1;
    }

    leftIndex++;
  }

  for (; rightIndex < right.length; rightIndex++) add(right[rightIndex]);
}
