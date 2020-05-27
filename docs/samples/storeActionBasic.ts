import { Store } from 'j-templates/Store';

// create a new Store with initial value
var store = new Store({ 
    header: { 
        title: "title of object",
        description: "description of object"
    },
    data: [
        { row: "row value" }
    ]
});

function UpdateTitle(title: string) {
    store.Action((root, writer) => {
        writer.Merge(root.header, { title: title });
    });
}

function AddRow(text: string) {
    store.Action((root, writer) => {
        writer.Push(root.data, { row: text });
    });
}

// creating/adding elements
function Copy(val: any) {
    return {
        header: {
            title: val.header.title,
            description: val.header.description,
        },
        data: [
            ...val.data.map(d => ({ row: d.row }))
        ]
    }
}
var jsonScope = store.Root.Scope(parent => JSON.stringify(Copy(parent), null, 1));
var pre = document.createElement("pre");
pre.innerText = jsonScope.Value;
jsonScope.Watch(scope => pre.innerText = scope.Value);

var input = document.createElement("input");
input.type = "text";
input.value = store.Root.Value.header.title;
input.addEventListener("blur", (e: any) => {
    UpdateTitle(e.target.value);
});

var input2 = document.createElement("input");
input2.type = "text";
input2.placeholder = "New row...";

var button = document.createElement("input");
button.type = "button";
button.value = "Add Row";
button.addEventListener("click", () => {
    if(!input2.value)
        return;

    AddRow(input2.value);
});

document.body.appendChild(input);
document.body.appendChild(document.createElement("br"));
document.body.appendChild(input2);
document.body.appendChild(button);
document.body.appendChild(pre);