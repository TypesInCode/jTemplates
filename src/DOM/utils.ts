export function SetInputValue(target: HTMLInputElement, value: string) {
    if(target.nodeName !== "INPUT")
        target.value = value;
    else {
        var start = target.selectionStart;
        var end = target.selectionEnd;
        target.value = value;
        target.setSelectionRange(start, end);
    }
}