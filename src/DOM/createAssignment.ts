const DEFAULT_ASSIGNMENT = {};

export function CreateAssignment(target: any, createAssignment: {(target: any, key: string): (next: any) => void }) {
    let last: any | undefined;
    let writeTo: {[key: string]: (next: any) => void} = {};
    return function AssignNext(next: any) {
      if (next === last)
        return;

      last = next;
      next = !next ? DEFAULT_ASSIGNMENT : next;
      for(const key in writeTo) {
        writeTo[key](next);
      }

      for(const key in next) {
        if(!Object.hasOwn(writeTo, key)) {
          writeTo[key] = createAssignment(target, key);
          writeTo[key](next);
        }
      }
    }
  }
