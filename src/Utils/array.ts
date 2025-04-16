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

export function ReconcileSortedEmitters<T extends [number]>(left: T[], right: T[], add: (value: T) => void, remove: (value: T) => void) {
  let leftIndex = 0;
  let rightIndex = 0;

  while(leftIndex < left.length && rightIndex < right.length) {
    let li = leftIndex;
    let ri = rightIndex;

    for(; li < left.length && left[li][0] < right[ri][0]; li++)
      remove(left[li]);

    while(li < left.length && ri < right.length && left[li][0] === right[ri][0]) {
      li++;
      ri++;
    }

    for(; ri < right.length && li < left.length && right[ri][0] < left[li][0]; ri++)
      add(right[ri]);

    leftIndex = li;
    rightIndex = ri;
  }

  for(let li = leftIndex; li < left.length; li++)
    remove(left[li]);

  for(let ri = rightIndex; ri < right.length; ri++)
    add(right[ri]);
}

export function ReconcileSortedArrays<T>(left: T[], right: T[], add: (value: T) => void, remove: (value: T) => void) {
  let leftIndex = 0;
  let rightIndex = 0;

  while(leftIndex < left.length && rightIndex < right.length) {
    let y = rightIndex;

    for(; y<right.length && left[leftIndex] !== right[y]; y++) {}

    if(y === right.length)
      remove(left[leftIndex]);
    else {
      for(let z=rightIndex; z < y; z++)
        add(right[z]);

      rightIndex = y + 1;
    }

    leftIndex++;
  }

  for(; rightIndex < right.length; rightIndex++)
    add(right[rightIndex]);
}
