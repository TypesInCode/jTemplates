import { JsonType } from "../Utils/jsonType";
import { CreateAssignment } from "./createAssignment";

export function CreateNodeValueAssignment(target: HTMLElement) {
  let lastValue = target.nodeValue;
  return function AssignNodeValue(value: string) {
    if (value !== lastValue) {
      target.nodeValue = value;
      lastValue = value;
    }
  }
}

function AssignValue(target: any, value: string) {
  const start = target.selectionStart;
  const end = target.selectionEnd;
  target.value = value;
  if (target.ownerDocument.activeElement === target)
    target.setSelectionRange(start, end);

}

export function CreatePropertyAssignment(target: any, prop: string) {
  let lastValue: any;
  let childPropertyAssignment: any;

  return function(next: any) {
    const nextValue = next && next[prop];
    if(nextValue === lastValue)
      return;

    lastValue = nextValue;

    if(childPropertyAssignment !== undefined)
      childPropertyAssignment(target[prop], nextValue);

    const nextValueType = JsonType(nextValue);
    switch(nextValueType) {
      case "value":
        switch(prop) {
          case "value":
            AssignValue(target, nextValue || "");
            break;
          default:
            target[prop] = nextValue;
            break;
        }
        break;
      default:
        childPropertyAssignment ??= CreateAssignment(target[prop], CreatePropertyAssignment);
        childPropertyAssignment(target[prop], nextValue);
        break;
    }
  }
}





/* export function CreatePropertyAssignment(target: any) {
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
      writeTo[key] ??= CreateAssignProp(target, key);
    }

    const writeKeys = Object.keys(writeTo);
    for(let x=0; x<writeKeys.length; x++)
      writeTo[writeKeys[x]](next);
  }
} */
