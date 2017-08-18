import Observable from "./Observable/observable";
import Bindings from "./DOM/Binding/bindings";
import browser from "./DOM/browser";
import Template from "./DOM/template";
import Component from "./DOM/Component/component";

class Comp extends Component {
    private state = Observable.Create({
        parentProp1: "parentValue",
        parentProp2: "second value",
        fontColor: "red",
        array: ["first", "second", "third"]
    });

    public get State() {
        return this.state;
    }

    public get Template(): string {
return `
<div>
    {{ $comp.State.parentProp1 }}
    <${SubComp} j-parent="{ pValue: $comp.State.parentProp1, color: $comp.State.fontColor, array: $comp.State.array }">
        <header>
            {{ $parent.pValue }}
        </header>
        <content>
            <div>{{ $parent.color }} <b>{{ $data }}</b></div>
        </content>
    </${SubComp}>
</div>`;
    }
}

class SubComp extends Component {
    public static get Name(): string {
        return "Sub-Comp";
    }

    private state = Observable.Create({
        prop1: "Test",
        prop2: "test2",
        color: "green",
        array: []
    });

    public get State() {
        return this.state;
    }

    public get Template(): string {
return `
<header/>
<div j-onclick="$comp.OnDivClick" style="color: {{$state.color}}" j-array="['default'].concat($state.array.valueOf())">
    <div>Component name is: {{ $data }}</div>
    <content />
</div>`;
    }

    public SetParentData(data: any) {
        super.SetParentData(data);
        this.State.prop2 = data.pValue;
        this.State.color = data.color;
        this.State.array = data.array;
    }

    protected BindingParameters(): {[name: string]: any} {
        var params = super.BindingParameters();
        params["$state"] = this.State;
        return params;
    }

    protected OnDivClick(e: Event) {
        console.log("div has been clicked");
    }
}

(browser.window as any).Comp = Comp;
(browser.window as any).SubComp = SubComp;
(browser.window as any).Observable = Observable;

var div = browser.window.document.createElement("div");
var comp = new Comp();
comp.AttachTo(div);
console.log(div.outerHTML);

var obsArr = new Observable(["first", "second", "third"]);
var test = ["prefix"].concat(obsArr.valueOf() as any as Array<any>);
console.log(test.length);