export { NodeRef } from "./Node/nodeRef";
export { Component } from "./Node/component";

/* import { div } from "./DOM/elements";

class Temp {
    public getVal() {
        return "temp function val";
    }

    public Destroy() {

    }
}

class Temp2 {
    public notVal() {
        return "temp";
    }

    public Destroy() { }
}

class ChildComp extends Component {

    @Inject(Temp)
    temp: Temp;

    public Template() {
        return div({ text: () => this.temp.getVal() })
    }

}

var childComp = Component.ToFunction("child-comp", null, ChildComp);

@PreReqTemplate(() => [])
class TestComp extends Component {

    @PreReq()
    prereq = { Init: Promise.resolve() };

    @Store()
    private state: any = { test: "start", array: [1, 2, 3, 4] };

    @Store()
    private state2 = { temp: "end" };

    private fullStore = new StoreSync({ data: [{ _id: 1, val: 'any' }, { _id: 2, val: 'second' }, { _id: 3, val: 'third' }] });

    @Inject(Temp)
    @Destroy()
    temp = new Temp()

    @Scope()
    get Test() {
        return `${this.state.test} ${this.state2.temp}`;
    }

    @Scope()
    get Array() {
        return this.state.array.map((val: number) => val * 10);
    }

    public Template() {
        return div({}, () => [
            div({ text: () => this.Test, on: { click: () => this.state = { test: "changed to this", array: [1, 2, 3, 4, 5] } } }),
            childComp({}),
            div({ key: (val) => val._id, data: () => this.fullStore.Root.Value.data }, (val) => 
                div({ text: () => val.val, on: { click: async () => {
                        await this.fullStore.Action(async (reader, writer) => {
                            var ind = reader.Root.data.findIndex(v => v._id === val._id);
                            writer.Splice(reader.Root.data, ind, 1);
                        });
                    }
                } })
            )
        ]);
    }

}

var testComp = Component.ToFunction("test-comp", null, TestComp);
var node = testComp({});
Component.Attach(document.getElementById("container"), node);

// setTimeout(() => node.Destroy(), 500); */