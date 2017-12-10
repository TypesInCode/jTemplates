declare abstract class Binding<T> {
    private boundTo;
    private observableScope;
    private setCallback;
    private scheduleUpdate;
    private status;
    protected readonly Value: any;
    protected readonly BoundTo: T;
    constructor(boundTo: T, binding: any, scheduleUpdate: (callback: () => void) => void);
    Update(): void;
    protected abstract Apply(): void;
    Destroy(): void;
}
export default Binding;
