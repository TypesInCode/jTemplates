import { StoreAsync } from 'j-templates/Store';

// create a new StoreAsync with initial value
var store = new StoreAsync((val) => val._id, { _id: "root", message: "initial message" });

// store.Root is an ObservableScope watching the root of the store
// store.Root.Scope creates a dependent Scope
var messageScope = store.Scope("root", (parent: { _id: string, message: string }) => parent.message);
// Scope.Watch fires an event when the value of the scope changes
messageScope.Watch(scope => {
    document.getElementById("log").innerText = "Updated: " + (new Date()).toISOString();
    document.getElementById("message").innerText = scope.Value;
});

var input = document.createElement("input") as HTMLInputElement;
input.type = "text";
input.id = "message-input";
input.value = messageScope.Value;
document.body.appendChild(input);

var button = document.createElement("input");
button.type = "button";
button.value = "UPDATE";
button.addEventListener("click", () => {
    var value = (document.getElementById("message-input") as HTMLInputElement).value;
    store.Merge("root", { message: value });
});
document.body.appendChild(button);

var div = document.createElement("div");
div.id = "message";
div.innerText = messageScope.Value;
document.body.appendChild(div);

div = document.createElement("div");
div.id = "log";
document.body.appendChild(div);