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

export function CreateAssignment(target: any) {
    const writeTo: any = {};
    return function AssignNext(next: any) {
        const keys = Object.keys(next);
        for(let x=0; x<keys.length; x++) {
            const value = next[keys[x]];
            writeTo[keys[x]] ??= JsonType(value) === 'value' ?
                AssignProp(target, keys[x]) : 
                CreateAssignment(target[keys[x]]);

            writeTo[keys[x]](value);
        }
    }
}