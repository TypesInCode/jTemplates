import { Template } from "./template";
import { ObjectStore, Value } from './ObjectStore/objectStore';
import { div, span, input, b, a, br, img, video, source, option, select, h1, h2, h3 } from "./DOM/elements";

// import { ProxyObservable, Value } from "./ProxyObservable/proxyObservable";

export { Template, ObjectStore, Value, div, span, input, b, a, br, img, video, source, option, select, h1, h2, h3 };

/* var data = [] as Array<{_id: string, name: string, child: { _id: string, name: string } }>;
for(var x=0; x<10000; x++) {
    data[x] = {
        _id: `root_${x}`,
        name: `item ${x}`,
        child: {
            _id: `child_${Math.ceil(Math.random() * 3)}`,
            name: `child item ${x}`
        }
    };
}

var count = 0;
var store = ObjectStore.Create([], (val) => val._id);

setTimeout(() => {
    store.Write(store.Root, () => data);
}, 5000);

class Comp extends Template<any, any> {

    state = ObjectStore.Create({ filter: "" });

    get VisibleItems() {
        var s = new Date();
        var d =  data.filter(i => {
            return i.child.name.toLowerCase().indexOf(this.state.Root.filter.toLowerCase()) >= 0;
        });
        var e = new Date();
        console.log(`Raw data processed in ${e.getTime() - s.getTime()} milliseconds`);

        var start = new Date();
        var ret =  store.Root.filter(i => {
            return i.child.name.toLowerCase().indexOf(this.state.Root.filter.toLowerCase()) >= 0;
        });
        var end = new Date();

        console.log(`Data processed in ${end.getTime() - start.getTime()} milliseconds`);

        return ret;
    }

    protected Template() {
        return [
            input({ props: () => ({ type: "button", value: "click" }), on: () => ({ click: this.onClick.bind(this) }) }),
            input({ props: () => ({ type: "text", value: "" }), on: () => ({ keyup: this.onKeyUp.bind(this) }) }),
            div({ key: i => i._id, data: () => this.VisibleItems }, (item) => [
                div({ text: () => item.name }),
                div({ data: () => item.child }, (child) => [
                    div({ text: () => `Id: ${child._id} Name: ${child.name}` })
                ])
            ])
        ]
    }

    constructor() {
        super("app");
    }

    onClick() {
        store.Root[42].child.name = "test";
    }

    onKeyUp(e: any) {
        if(this.state.Root.filter === e.target.value)
            return;
        
        var start = new Date();
        this.state.Write(this.state.Root, (val) => { val.filter = e.target.value });
        this.UpdateComplete(() => {
            var end = new Date();
            console.log(`Update complete in ${end.getTime() - start.getTime()} milliseconds`);
        });
    }

}

import { browser } from "./DOM/browser";

var container = browser.window.document.getElementById("container");
var comp = new Comp();
var start = new Date();
comp.AttachTo(container);
var end = new Date();

console.log(`Attached in ${end.getTime() - start.getTime()} milliseconds`) */
