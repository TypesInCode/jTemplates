export declare abstract class Binding<T> {
    private boundTo;
    private isStatic;
    private staticValue;
    private observableScope;
    private setCallback;
    private status;
    protected readonly Value: any;
    protected readonly BoundTo: any;
    constructor(boundTo: any, binding: {
        (): any;
    } | any, config: T);
    Update(): void;
    Destroy(): void;
    protected Init(config: T): void;
    protected abstract Apply(): void;
}
