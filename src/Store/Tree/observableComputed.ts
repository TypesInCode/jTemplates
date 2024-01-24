import { JsonDeepClone } from "../../Utils/json";
import { List } from "../../Utils/list";
import { ObservableNode } from "./observableNode";
import { IObservableScope, ObservableScope } from "./observableScope";

const scheduleNodes = new Set<unknown>();
const computedQueue = List.Create<{ node: { data: unknown }, scope: IObservableScope<unknown> }>();

function updateNode({node, scope}: { node: { data: unknown }, scope: IObservableScope<unknown> }) {
    const value = ObservableScope.Value(scope);
    node.data = JsonDeepClone(value);
}

let computing = false;
function scheduleComputed(node: { data: unknown }, scope: IObservableScope<unknown>) {
    if(scheduleNodes.has(node))
        return;

    scheduleNodes.add(node);
    List.Add(computedQueue, { node, scope });

    if(!computing) {
        computing = true;
        queueMicrotask(function() {
            computing = false;
            scheduleNodes.clear();

            List.ForEach(computedQueue, updateNode);
            List.Clear(computedQueue);
        });
    }
}

function CreateComputed<T>(compute: () => T) {
    const scope = ObservableScope.Create(compute);
    const node = ObservableNode.Create({ data: null });
    ObservableScope.Watch(scope, function(scope) {
        scheduleComputed(node, scope);
    });
    node.data = ObservableScope.Value(scope);

    return ObservableScope.Create(function () { return node.data }, [scope]);
}

export namespace ObservableComputed {
    export function Create<T>(compute: () => T) {
        return CreateComputed(compute);
    }
}