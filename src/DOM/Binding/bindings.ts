import Binding from "../../binding";
import TextBinding from "./textBinding";
import ComponentBinding from "./componentBinding";
import AttributeBinding from "./attributeBinding";
import EventBinding from "./eventBinding";
import ArrayBinding from "./arrayBinding";
import browser from "../browser";

namespace Bindings {
    var pendingUpdates: Array<() => void> = [];
    var updateScheduled = false;

    function BindingMethods(): Array<(element: Node, bindingParameters: { [name: string]: any }, update: (callback: () => void) => void) => Array<Binding<Node>>> {
        return [
            require("./textBinding").default.Create,
            require("./componentBinding").default.Create,
            //require("./attributeBinding").default.Create,
            require("./eventBinding").default.Create,
            require("./eventBinding").default.Create,
            require("./arrayBinding").default.Create,
            require("./propertyBinding").default.Create
        ];
    }

    export function ScheduleUpdate(callback: () => void): void {
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

    export function Bind(element: Node, parameters: {[name: string]: any}): Array<Binding<Node>> {
        var bindingMethods = BindingMethods();
        var ret: Array<Binding<Node>> = [];
        var skipChildren = false;

        if(element.nodeType != element.DOCUMENT_FRAGMENT_NODE) {
            for(var x=0; x<bindingMethods.length; x++) {
                var bindings = bindingMethods[x](element, parameters, ScheduleUpdate);
                for(var y=0; y<bindings.length; y++) {
                    skipChildren = skipChildren || bindings[y].BindsChildren;
                    ret.push(bindings[y]);
                }
            }
        }

        for(var z=0; z<element.childNodes.length && !skipChildren; z++) {
            var childBindings = Bind(element.childNodes[z], parameters);
            for(var i=0; i<childBindings.length; i++)
                ret.push(childBindings[i]);
        }
        
        return ret;
    }
}

export default Bindings;