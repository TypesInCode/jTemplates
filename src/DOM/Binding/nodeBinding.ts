import Binding from "../../binding";
import browser from "../browser";
import { ValueFunction } from "../elements";

var pendingUpdates: Array<() => void> = [];
var updateScheduled = false;

function ScheduleUpdate(callback: () => void): void {
    /* var ind = pendingUpdates.indexOf(callback);
    if(ind < 0) { */
        pendingUpdates.push(callback);
    // }

    if(!updateScheduled) {
        updateScheduled = true;
        browser.requestAnimationFrame(() => {
            updateScheduled = false;
            for(var x=0; x<pendingUpdates.length; x++)
                pendingUpdates[x]();

            pendingUpdates = [];
            // while(pendingUpdates.length > 0)
            //     pendingUpdates.shift()();
        });
    }
}

abstract class NodeBinding extends Binding<Node> {
    constructor(boundTo: Node, binding: ValueFunction<any>) {
        super(boundTo, binding, ScheduleUpdate);
    }
}

export default NodeBinding;