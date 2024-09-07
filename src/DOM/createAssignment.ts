export function CreateAssignment(target: any, createAssignment: {(target: any, key: string): (next: any) => void }) {
    let last: any | undefined;
    let writeTo: any;
    return function AssignNext(next: any) {
      if (next === last)
        return;
  
      last = next;
  
      writeTo ??= {};
      const nextKeys = next && Object.keys(next);
  
      for(let x=0; nextKeys && x<nextKeys.length; x++) {
        const key = nextKeys[x];
        writeTo[key] ??= createAssignment(target, key);
      }
  
      const writeKeys = Object.keys(writeTo);
      for(let x=0; x<writeKeys.length; x++)
        writeTo[writeKeys[x]](next);
    }
  }