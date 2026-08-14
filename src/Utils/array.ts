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

  if (nullIndex < array.length)
    array.splice(nullIndex);
}
