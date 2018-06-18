import Emitter from "../emitter";
declare class ObservableScope<T> extends Emitter {
    private parameters;
    private observableFunction;
    private childObservables;
    private dirty;
    private value;
    private setCallback;
    readonly Value: T;
    readonly Dirty: boolean;
    constructor(observableFunction: {
        (...params: any[]): T;
    }, ...params: Array<any>);
    Destroy(): void;
    protected UpdateValue(): void;
    private SetCallback;
}
export default ObservableScope;
