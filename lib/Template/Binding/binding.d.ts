import { FunctionOr } from '../template.types';
import { Injector } from '../../injector';
import { NodeRef } from '../nodeRef';
export declare abstract class Binding<T> {
    private injector;
    private boundTo;
    private isStatic;
    private staticValue;
    private observableScope;
    private setCallback;
    private status;
    protected readonly Value: any;
    protected readonly Injector: Injector;
    protected readonly BoundTo: NodeRef;
    protected readonly IsStatic: boolean;
    protected readonly SynchInit: boolean;
    constructor(boundTo: NodeRef, binding: FunctionOr<any>, config: T);
    Update(): void;
    Destroy(): void;
    protected OverrideBinding(binding: FunctionOr<any>, config: T): any;
    protected Init(config: T): void;
    protected abstract Apply(): void;
}
