export function CreateEventAssignment(target: HTMLElement, event: string) {
    let lastEvent: any;  
    return function(next: any) {
        const nextEvent = next && next[event];
        if(nextEvent === lastEvent)
            return;
    
        lastEvent && target.removeEventListener(event, lastEvent);
        nextEvent && target.addEventListener(event, nextEvent);
        lastEvent = nextEvent;
    }
}

export function AssignEvents(target: HTMLElement, eventMap: {[event: string]: any}) {
    const entries = Object.entries(eventMap);

    for(let x=0; x<entries.length; x++)
        target.addEventListener(entries[x][0], entries[x][1]);
}
