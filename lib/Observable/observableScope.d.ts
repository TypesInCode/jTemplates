import Emitter from "../emitter";
import Observable from "./observable";
declare class ObservableScope extends Emitter {
    private observableFunction;
    private childObservables;
    private dirty;
    private value;
    private setCallback;
    readonly Value: any;
    constructor(observableFunction: {
        (): any;
    });
    Destroy(): void;
    protected UpdateValue(): void;
    protected SetCallback(observable: Observable): void;
    protected AddListeners(observable: Observable): void;
    protected RemoveListeners(observable: Observable): void;
}
export default ObservableScope;
