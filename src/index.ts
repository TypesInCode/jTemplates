import browser from "./DOM/browser";
import { BindingTemplate } from "./DOM/bindingTemplate";
import Observable from "./Observable/observable";

var obj = Observable.Create({
    Prop1: "test",
    Prop2: "blue",
    Class: "garbage-man",
    Arr: ["obs1", "obs2"]
});

var template = new BindingTemplate([
{ style: { type: "text/css" }, data: obj, children: (d) => {
    return { text: () => `
        .garbage-man: {
            color: ${d.Prop2};
        }
        `}
    }
},
{ div: { className: () => obj.Class, style: { color: "red" } }, data: () => obj.Arr, on: { click: () => (e: any) => alert("click") }, children: (c, i) => {
        return { text: () => `${c} ${i} obj.Prop1: ${obj.Prop1} --` };
    }
}]);

var div = browser.window.document.createElement("div");
template.AttachTo(div);
console.log(div.innerHTML);
obj.Prop1 = "something different";
obj.Prop2 = "orange";
console.log(div.innerHTML);
obj.Class = "garbage-person";
console.log(div.innerHTML);
obj.Arr = ["sec3", "sec4", "sec5"];
console.log(div.innerHTML);