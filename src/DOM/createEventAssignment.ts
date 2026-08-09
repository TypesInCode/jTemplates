export function EventAssignment(target: HTMLElement, event: string, next: any) {
  target.addEventListener(event, next);
}

export function CreateEventAssignment(target: HTMLElement, event: string) {
  let lastEvent: any;
  return function (next: any) {
    const nextEvent = next && next[event];
    if (nextEvent === lastEvent) return;

    lastEvent && target.removeEventListener(event, lastEvent);
    nextEvent && target.addEventListener(event, nextEvent);
    lastEvent = nextEvent;
  };
}
