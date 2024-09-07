export function RemoveNulls(array: (unknown | null)[], startIndex = 0) {
  let nullIndex = startIndex;
  for (; nullIndex < array.length && array[nullIndex] !== null; nullIndex++) { }
  let notNullIndex = nullIndex + 1;

  for (
    ;
    notNullIndex < array.length && array[notNullIndex] === null;
    notNullIndex++
  ) { }

  while (notNullIndex < array.length) {
    array[nullIndex] = array[notNullIndex];
    nullIndex++;
    notNullIndex++;

    for (
      ;
      notNullIndex < array.length && array[notNullIndex] === null;
      notNullIndex++
    ) { }
  }

  array.splice(nullIndex);
}

export function ArrayDiff(source: any[], target: any[]) {
  if (source === target)
    return false;

  if (!source || !target || source.length !== target.length)
    return true;

  let x = 0;
  for (; x < source.length && source[x] === target[x]; x++) { }

  return x < source.length;
}
