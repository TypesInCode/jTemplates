function SetValue(target: HTMLInputElement, value: string) {
    switch(target.nodeName) {
        case "INPUT":
            var start = target.selectionStart;
            var end = target.selectionEnd;
            target.value = value;
            if(target.ownerDocument.activeElement === target)
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
    const keys = Object.keys(properties);
    for(let x=0; x<keys.length; x++) {
        if(!lastProperties || lastProperties[keys[x]] !== properties[keys[x]])
            SetRootProperty(target, keys[x], properties[keys[x]], lastProperties && lastProperties[keys[x]]);
    }
}

export function SetProperties(target: HTMLElement, lastProperties: any, properties: any) {
    if(!lastProperties && target.nodeType === Node.TEXT_NODE)
        target.nodeValue = properties.nodeValue;
    else
        SetChangedProperties(target, lastProperties, properties);
}