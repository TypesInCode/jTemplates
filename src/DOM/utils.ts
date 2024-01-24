import { JsonType } from "../Utils/json";

function AssignProp(target: any, prop: string) {
    let lastValue = target[prop];
    return function Assign(value: any) {
        if(value !== lastValue) {
            target[prop] = value;
            lastValue = value;
        }
    }
}

export function CreateNodeValueAssignment(target: HTMLElement) {
    let lastValue = target.nodeValue;
    return function AssignNodeValue(value: { nodeValue: string }) {
        if(value.nodeValue !== lastValue) {
            target.nodeValue = value.nodeValue;
            lastValue = value.nodeValue;
        }
    }
}

function CreateValueAssignment(target: HTMLInputElement) {
    let lastValue = target.value;
    target.addEventListener('blur', function() {
        target.value = lastValue;
    });
    return function AssignValue(value: string) {
        if(value !== lastValue) {
            const start = target.selectionStart;
            const end = target.selectionEnd;
            target.value = value;
            if(target.ownerDocument.activeElement === target)
                target.setSelectionRange(start, end);

            lastValue = value;
        }
    }
}

function ValueAssignment(target: any, writeTo: any, next: any) {
    writeTo.value ??= CreateValueAssignment(target);
    writeTo.value(next.value);
}

function DefaultAssignment(target: any, writeTo: any, next: any, prop: string) {
    const value = next[prop];
    writeTo[prop] ??= JsonType(value) === 'value' ?
        AssignProp(target, prop) : 
        CreateAssignment(target[prop], false);

    writeTo[prop](value);
}

export function CreateAssignment(target: any, root = true) {
    const writeTo: any = {};
    return function AssignNext(next: any) {
        const keys = Object.keys(next);
        for(let x=0; x<keys.length; x++) {
            switch(root) {
                case true: {
                    switch(keys[x]) {
                        case 'value':
                            ValueAssignment(target, writeTo, next);
                            break;
                        default:
                            DefaultAssignment(target, writeTo, next, keys[x]);
                            break;
                    }
                    break;
                }
                default:
                    DefaultAssignment(target, writeTo, next, keys[x]);
                    break;
            }
        }
    }
}