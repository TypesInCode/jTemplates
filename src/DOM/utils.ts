function SetValue(target: HTMLInputElement, value: string) {
    switch(target.nodeName) {
        case "INPUT":
            var start = target.selectionStart;
            var end = target.selectionEnd;
            target.value = value;
            target.setSelectionRange(start, end);
            break;
        default:
            target.value = value;
    }
}

function SetStyle(target: HTMLElement, styleDef: {[prop: string]: string}, lastStyleDef: {[prop: string]: string}) {
    for(var key in styleDef)
        if(!lastStyleDef || lastStyleDef[key] !== styleDef[key])
            (target.style as any)[key] = styleDef[key];
}

function SetRootProperty(target: HTMLElement, prop: string, value: any, lastValue: any) {
    switch(prop) {
        case "value":
            SetValue(target as HTMLInputElement, value);
            break;
        case "style":
            SetStyle(target, value, lastValue);
            break;
        default:
            (target as any)[prop] = value;
    }
}

function SetChangedProperties(target: HTMLElement, lastProperties: any, properties: any) {
    for(var key in properties) {
        (!lastProperties || lastProperties[key] !== properties[key]) &&
            SetRootProperty(target, key, properties[key], lastProperties && lastProperties[key]);
    }
}

export function SetProperties(target: HTMLElement, lastProperties: any, properties: any) {
    if(!lastProperties && target.nodeType === Node.TEXT_NODE)
        target.nodeValue = properties.nodeValue;
    else
        SetChangedProperties(target, lastProperties, properties);
}