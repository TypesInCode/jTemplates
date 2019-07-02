import { FunctionOr } from '../template.types';
import { Injector } from '../../injector';
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
    protected readonly BoundTo: any;
    protected readonly IsStatic: boolean;
    protected readonly ScheduleUpdate: boolean;
    constructor(boundTo: any, binding: FunctionOr<any>, config: T);
    Update(): void;
    Destroy(parentDestroyed?: boolean): void;
    protected OverrideBinding(binding: FunctionOr<any>, config: T): any;
    protected Init(config: T): void;
    protected abstract Apply(): void;
}
