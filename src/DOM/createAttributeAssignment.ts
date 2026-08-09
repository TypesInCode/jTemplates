export function AttributeAssignment(target: HTMLElement, attribute: string, next: any) {
  target.setAttribute(attribute, next);
}

export function CreateAttributeAssignment(target: HTMLElement, attribute: string) {
    let lastValue: any;
    return function(next: any) {
        const nextValue = next && next[attribute];
        if(nextValue === lastValue)
            return;

        if(nextValue === undefined)
            target.removeAttribute(attribute);
        else
            target.setAttribute(attribute, nextValue);

        lastValue = nextValue;
    }
}
