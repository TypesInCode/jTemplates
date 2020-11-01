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

function SetStyle(target: HTMLElement, styleDef: {[prop: string]: string}) {
    for(var key in styleDef)
        (target.style as any)[key] = styleDef[key];
}

function SetRootProperties(target: HTMLElement, properties: any) {
    for(var key in properties) {
        switch(key) {
            case "value":
                SetValue(target as HTMLInputElement, properties.value);
                break;
            case "style":
                SetStyle(target, properties.style);
                break;
            case "className":
                target.className = properties.className;
                break;
            default:
                (target as any)[key] = properties[key];
                break;            
        }
    }
}

export function SetProperties(target: HTMLElement, properties: any) {
    switch(target.nodeType) {
        case Node.TEXT_NODE:
            target.nodeValue = properties ? properties.nodeValue : "";
        default:
            SetRootProperties(target, properties);
    }
}