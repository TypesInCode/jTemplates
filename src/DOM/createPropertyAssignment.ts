import { JsonType } from "../Utils/json";

export function CreateNodeValueAssignment(target: HTMLElement) {
  let lastValue = target.nodeValue;
  return function AssignNodeValue(value: string) {
    if (value !== lastValue) {
      target.nodeValue = value;
      lastValue = value;
    }
  };
}

function WalkValue(
  next: { [prop: string]: any },
  callback: (path: string, value: any, index: number) => void,
  index = 0,
  parent = "",
) {
  const entries = Object.entries(next);
  for (let x = 0; x < entries.length; x++) {
    const [key, value] = entries[x];
    const type = JsonType(value);
    switch (type) {
      case "object":
        index = WalkValue(value, callback, index, `${parent}${key}.`);
        break;
      default:
        callback(`${parent}${key}`, value, index);
        index++;
        break;
    }
  }
  return index;
}

function AssignNodeValue(target: any, value: string) {
  target.nodeValue = value;
}

function AssignValue(target: any, value: string) {
  const start = target.selectionStart;
  const end = target.selectionEnd;
  target.value = value;
  if(target.ownerDocument.activeElement === target)
    target.setSelectionRange(start, end);
}

function AssignClassName(target: any, value: string) {
  target.className = value;
}

function GetAssignmentFunction(path: string): (target: any, next: any) => void {
  switch (path) {
    case "nodeValue":
      return AssignNodeValue;
    case "value":
      return AssignValue;
    case "className":
      return AssignClassName;
    default:
      return new Function("t", "v", `t.${path} = v;`) as (
        target: any,
        next: any,
      ) => void;
  }
}

export function CreatePropertyAssignment(target: any) {
  if((target as Node).nodeType === Node.TEXT_NODE) {
    return function(next: { nodeValue: string }) {
      AssignNodeValue(target, next.nodeValue);
    };
  }
  
  const last: [string, any, (target: any, next: any) => void][] = [
    ["", null, null],
  ];

  function WalkCallback(path: string, value: any, index: number) {
    if (index >= last.length || last[index][0] !== path) {
      last[index] = [path, value, GetAssignmentFunction(path)];
      last[index][2](target, value);
    } else if (last[index][1] !== value) {
      last[index][1] = value;
      last[index][2](target, value);
    }
  }

  return function AssignProperty(next: { [prop: string]: any }) {
    if (next === null) {
      for (let x = 0; x < last.length; x++) last[x][2] !== null && last[x][2](target, null);

      if (last.length > 0) last.splice(0);

      return;
    }

    const endIndex = WalkValue(next, WalkCallback);
    if (endIndex < last.length) last.splice(endIndex);
  };
}

export function AssignProperties(target: any, next: any) {
  WalkValue(next, function(path, value) {
    const assignment = GetAssignmentFunction(path);
    assignment(target, value);
  })
}
