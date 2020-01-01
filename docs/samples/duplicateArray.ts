import { Component } from "j-templates";
import { StoreSync } from "j-templates/Store";
import { div } from "j-templates/DOM";
import { stringify } from "querystring";

class DuplicateArray extends Component {
    state = new StoreSync({ 
        sourceArray: [
            { _id: "1", value: "first" },
            { _id: "2", value: "second" },
            { _id: "3", value: "third" }
        ],
        targetArray: [] as Array<{ _id: string, value: string }>
    }, (val) => val._id);

    public Template() {
        return [
            div({ text: "Source:" }),
            div({ data: () => this.state.Root.Value.sourceArray }, (data) => 
                div({ on: { 
                    click: () => {
                        this.state.Action(async (reader, writer) => {
                            var obj = reader.Get<{ _id: string, value: string }>(data._id);
                            await writer.Push(reader.Root.targetArray, obj);
                        })
                    }
                }, text: () => data.value })
            ),
            div({ text: "Target:" }),
            div({ data: () => this.state.Root.Value.targetArray }, (data) => 
                div({ on: {
                    click: () => {
                        this.state.Action(async (reader, writer) => {
                            var ind = reader.Root.targetArray.findIndex(v => v === data);
                            if(ind >= 0)
                                await writer.Splice(reader.Root.targetArray, ind, 1);
                        });
                    }
                }, text: data.value })
            )
        ]
    }
}

var duplicateArray = Component.ToFunction("duplicate-array", null, DuplicateArray);
Component.Attach(document.body, duplicateArray({}));