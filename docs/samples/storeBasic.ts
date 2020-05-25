import { Store } from 'j-templates/Store';

// create a new Store with initial value
var store = new Store({ message: "initial message" });

// store.Root is an ObservableScope watching the root of the store
// store.Root.Watch fires an event when the value of the scope updates
store.Root.Watch(scope => {
    document.getElementById("log").innerText = "Updated: " + (new Date()).toISOString();
    document.getElementById("message").innerText = scope.Value.message;
});

var input = document.createElement("input") as HTMLInputElement;
input.type = "text";
input.id = "message-input";
input.value = store.Root.Value.message;
document.body.appendChild(input);

var button = document.createElement("input");
input.type = "button";
input.value = "UPDATE";
input.addEventListener("click", () => {
    var value = (document.getElementById("message-input") as HTMLInputElement).value;
    store.Merge({ message: value });
});
document.body.appendChild(button);

var div = document.createElement("div");
div.id = "message";
div.innerText = store.Root.Value.message;
document.body.appendChild(div);

div = document.createElement("div");
div.id = "log";
document.body.appendChild(div);