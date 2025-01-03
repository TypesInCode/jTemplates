export function CreateAssignment(target: any, createAssignment: {(target: any, key: string): (next: any) => void }) {
    let last: any | undefined;
    let writeTo: {[key: string]: (next: any) => void} = {};
    return function AssignNext(next: any) {
      if (next === last)
        return;
  
      last = next;
      const nextKeys = next && Object.keys(next);
  
      for(let x=0; nextKeys && x<nextKeys.length; x++) {
        const key = nextKeys[x];
        writeTo[key] ??= createAssignment(target, key);
      }

      const writeFunctions = Object.values(writeTo);
      for(let x=0; x<writeFunctions.length; x++)
        writeFunctions[x](next);
    }
  }