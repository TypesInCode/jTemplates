function AssignEvent(target: HTMLElement, event: string) {
    let lastValue: {(event: Event): void};
    return function Assign(value: {(event: Event): void}) {
        if(value !== lastValue) {
            lastValue && target.removeEventListener(event, lastValue);
            value && target.addEventListener(event, value);
            lastValue = value;
        }
    }
}

function DefaultAssignment(target: HTMLElement, writeTo: any, next: {(event: Event): void}, event: string) {
    const value = next;
    writeTo[event] ??= AssignEvent(target, event);
    writeTo[event](value);
}

export function CreateEventAssignment(target: HTMLElement) {
    let priorKeys: string[]; // = [];
    const writeTo: any = {};
    return function AssignNext(next: null | {[event: string]: (event: Event) => void}) {
        const nextKeys = next !== null ? Object.keys(next) : [];
        const keys = priorKeys === undefined ? nextKeys : nextKeys.concat(priorKeys);

        priorKeys = nextKeys;
        for(let x=0; x<keys.length; x++)
            DefaultAssignment(target, writeTo, next && next[keys[x]], keys[x]);
    }
}