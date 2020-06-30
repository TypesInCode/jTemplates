import { StoreAsync } from 'j-templates/Store';

// create a new StoreAsync with initial value
// StoreAsync takes a callback to compute unique ID's for objects
var store = new StoreAsync((val) => val._id, { _id: "root", message: "initial message" });

// store.Scope creates a dependent Scope but retrieves the object by ID
var messageScope = store.Scope("root", (parent: { _id: string, message: string }) => parent.message);
// Scope.Watch fires an event when the value of the scope changes
messageScope.Watch(scope => {
    document.getElementById("log").innerText = "Updated: " + (new Date()).toISOString();
    document.getElementById("message").innerText = scope.Value;
});

var button = document.createElement("input");
button.addEventListener("click", async () => {
    var value = (document.getElementById("message-input") as HTMLInputElement).value;
    // store.Merge is async and should be awaited
    await store.Merge("root", { message: value });
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