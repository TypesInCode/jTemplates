import Emitter from "../../Utils/emitter";
export declare namespace ScopeCollector {
    function Watch(action: {
        (): void;
    }): Set<Emitter>;
    function Register(emitter: Emitter): void;
}
