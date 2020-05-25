import { Store } from 'j-templates/Store';

// create a new Store with initial value
var store = new Store({ message: "initial message" });

// store.Root is an ObservableScope watching the root of the store
// store.Root.Scope creates a dependent Scope
var messageScope = store.Root.Scope(parent => parent.message);
// Scope.Watch fires an event when the value of the scope changes
messageScope.Watch(scope => {
    document.getElementById("log").innerText = "Updated: " + (new Date()).toISOString();
    document.getElementById("message").innerText = scope.Value;
});

var button = document.createElement("input");
button.addEventListener("click", () => {
    var value = (document.getElementById("message-input") as HTMLInputElement).value;
    store.Merge({ message: value });
});

// creating/adding elements
var input = document.createElement("input") as HTMLInputElement;
input.type = "text";
input.id = "message-input";
input.value = messageScope.Value;

button.type = "button";
button.value = "UPDATE";

var div = document.createElement("div");
div.id = "message";
div.innerText = messageScope.Value;

var div2 = document.createElement("div");
div2.id = "log";

document.body.appendChild(input);
document.body.appendChild(button);
document.body.appendChild(div);
document.body.appendChild(div2);