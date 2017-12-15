import Emitter from "../emitter";
import { IMirrorTreeNode, JsonTreeNode } from "./jsonTreeNode";
declare class Observable extends Emitter implements IMirrorTreeNode {
    private _sourceNode;
    GetSourceNode(): JsonTreeNode<Observable>;
    SetSourceNode(sourceNode: JsonTreeNode<Observable>): void;
    SetValue(value: any): void;
    NodeUpdated(): void;
    Fire(name: string, ...args: any[]): void;
    Join(obs: any): void;
    UnJoin(): void;
    Destroy(): void;
    valueOf(): any;
    toString(): string;
}
declare namespace Observable {
    function Create<T>(initialValue: T): T & Observable;
    function Unwrap(value: any): any;
    function Watch(event: string, action: () => void): Array<Observable>;
}
export default Observable;
