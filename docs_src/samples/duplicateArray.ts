import { Component } from "j-templates";
import { StoreAsync } from "j-templates/Store";
import { Computed, Destroy } from "j-templates/Utils";
import { div, br } from "j-templates/DOM";

interface State {
    _id: string;
    sourceArray: Array<{ _id: string, value: string }>;
    targetArray: Array<{ _id: string, value: string }>;
}

class DuplicateArray extends Component {
    state = new StoreAsync((val) => val._id, {
        _id: "root",
        sourceArray: [
            { _id: "1", value: "first" },
            { _id: "2", value: "second" },
            { _id: "3", value: "third" }
        ],
        targetArray: [] as Array<{ _id: string, value: string }>
    } as State);

    @Destroy()
    rootScope = this.state.Scope<State, State>("root");

    @Computed()
    get indexedArray() {
        return this.rootScope.Value.targetArray.map((d, i) => ({ index: i, _id: d._id, value: d.value }))
    }

    public Template() {
        return [
            div({}, () => "Source:"),
            div({ data: () => this.rootScope.Value.sourceArray }, (data) => 
                div({ on: { 
                    click: () => {
                        this.state.Action<State>("root", async (val, writer) => {
                            var obj = { _id: data._id, value: data.value };
                            await writer.Push(val.targetArray, obj);
                        })
                    }
                } }, () => `${data.value}`)
            ),
            br({}),
            div({}, () => "Target:"),
            div({ data: () => this.indexedArray }, (data) => 
                div({ on: {
                    click: () => {
                        this.state.Action<State>("root", async (root, writer) => {
                            await writer.Splice(root.targetArray, data.index, 1);
                        });
                    }
                } }, () => `${data.value}`)
            )
        ]
    }

    public Destroy() {
        super.Destroy();
        this.state.Destroy();
    }
}

var duplicateArray = Component.ToFunction("duplicate-array", null, DuplicateArray);
Component.Attach(document.body, duplicateArray({}));