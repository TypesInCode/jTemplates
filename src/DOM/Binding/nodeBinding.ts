import Binding from "../../binding";
import browser from "../browser";

var pendingUpdates: Array<() => void> = [];
var updateScheduled = false;

function ScheduleUpdate(callback: () => void): void {
    var ind = pendingUpdates.indexOf(callback);
    if(ind < 0) {
        pendingUpdates.push(callback);
    }

    if(!updateScheduled) {
        updateScheduled = true;
        browser.requestAnimationFrame(() => {
            updateScheduled = false;
            while(pendingUpdates.length > 0)
                pendingUpdates.shift()();
        });
    }
}

abstract class NodeBinding extends Binding<Node> {
    constructor(boundTo: Node, binding: any | { (): any }) {
        super(boundTo, binding, ScheduleUpdate);
    }
}

export default NodeBinding;