import { JsonType } from "../Utils/json";
import { CreateAssignment } from "./createAssignment";

function CreatePropertyAssignment(target: any, property: string) {
  let lastValue: any;
  let jsonType: ReturnType<typeof JsonType>;
  let childAssignment: any;
  return function (next: any) {
    const nextValue = next && next[property];
    if (nextValue === lastValue || nextValue === undefined) return;

    jsonType ??= JsonType(nextValue);
    switch (jsonType) {
      case "value":
        (target as any)[property] = nextValue;
        break;
      default: {
        const childTarget = (target as any)[property];
        childAssignment ??= CreateAssignment(
          childTarget,
          CreateRootPropertyAssignment,
        );
        childAssignment(nextValue);
      }
    }
    lastValue = nextValue;
  };
}

export function CreateRootPropertyAssignment(
  target: HTMLElement,
  property: string,
) {
  let lastValue: any;
  let jsonType: ReturnType<typeof JsonType>;
  let childAssignment: any;
  return function (next: any) {
    const nextValue = next && next[property];
    if (nextValue === lastValue || nextValue === undefined) return;

    switch (property) {
      case "nodeValue": {
        AssignNodeValue(target, nextValue);
        break;
      }
      case "className": {
        AssignClassName(target, nextValue);
        break;
      }
      case "value": {
        AssignValue(target, nextValue);
        break;
      }
      default: {
        jsonType ??= JsonType(nextValue);
        switch (jsonType) {
          case "value":
            (target as any)[property] = nextValue;
            break;
          default: {
            const childTarget = (target as any)[property];
            childAssignment ??= CreateAssignment(
              childTarget,
              CreatePropertyAssignment,
            );
            childAssignment(nextValue);
          }
        }
      }
    }

    lastValue = nextValue;
  };
}

function AssignNodeValue(target: any, value: string) {
  target.nodeValue = value;
}

function AssignValue(target: any, value: string) {
  switch ((target as HTMLElement).nodeName) {
    case "INPUT": {
      const start = target.selectionStart;
      const end = target.selectionEnd;
      target.value = value;
      if (target.ownerDocument.activeElement === target) {
        const type = target.type;
        target.type = "text";
        target.setSelectionRange(start, end);
        target.type = type;
      }
      break;
    }
    default:
      target.value = value;
  }
}

function AssignClassName(target: any, value: string) {
  target.className = value;
}
