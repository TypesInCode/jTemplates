export function RemoveNulls(array: (unknown | null)[], startIndex = 0) {
  let nullIndex = startIndex;
  for (; nullIndex < array.length && array[nullIndex] !== null; nullIndex++) {}
  let notNullIndex = nullIndex + 1;

  while (notNullIndex < array.length) {
    for (
      ;
      notNullIndex < array.length && array[notNullIndex] === null;
      notNullIndex++
    ) {}
    array[nullIndex] = array[notNullIndex];
    nullIndex++;
    notNullIndex++;
  }

  array.splice(nullIndex);
}
