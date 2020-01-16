import { Component } from "j-templates";
import { StoreSync } from "j-templates/Store";
import { Computed } from "j-templates/Utils";
import { div, br, text } from "j-templates/DOM";

class DuplicateArray extends Component {
    state = new StoreSync({ 
        sourceArray: [
            { _id: "1", value: "first" },
            { _id: "2", value: "second" },
            { _id: "3", value: "third" }
        ],
        targetArray: [] as Array<{ _id: string, value: string }>
    }, (val) => val._id);

    @Computed()
    get indexedArray() {
        return this.state.Root.Value.targetArray.map((d, i) => ({ index: i, _id: d._id, value: d.value }))
    }

    public Template() {
        return [
            div({}, () => text("Source:")),
            div({ data: () => this.state.Root.Value.sourceArray }, (data) => 
                div({ on: { 
                    click: () => {
                        this.state.Action(async (reader, writer) => {
                            var obj = reader.Get<{ _id: string, value: string }>(data._id);
                            await writer.Push(reader.Root.targetArray, obj);
                        })
                    }
                } }, () => text(() => data.value))
            ),
            br({}),
            div({}, () => text("Target:")),
            div({ data: () => this.indexedArray }, (data) => 
                div({ on: {
                    click: () => {
                        this.state.Action(async (reader, writer) => {
                            await writer.Splice(reader.Root.targetArray, data.index, 1);
                        });
                    }
                } }, () => text(() => data.value))
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