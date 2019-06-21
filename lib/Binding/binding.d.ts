import { PromiseOr } from '../template.types';
export declare abstract class Binding<T> {
    private boundTo;
    private isStatic;
    private staticValue;
    private observableScope;
    private setCallback;
    private status;
    protected readonly Value: any;
    protected readonly BoundTo: any;
    protected readonly IsStatic: boolean;
    constructor(boundTo: any, binding: PromiseOr<any>, config: T);
    Update(): void;
    Destroy(parentDestroyed?: boolean): void;
    protected OverrideBinding(binding: PromiseOr<any>, config: T): any;
    protected Init(config: T): void;
    protected abstract Apply(): void;
}
