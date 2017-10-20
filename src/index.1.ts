import Observable from "./Observable/observable";
import Bindings from "./DOM/Binding/bindings";
import browser from "./DOM/browser";
import Template from "./DOM/template";
import Component from "./DOM/Component/component";

interface ITemplate {
    [name: string]: { };
    text?: string | { (): string };
    component?: typeof Component;
    data?: { (): {} } | {} | Array<{}>;
    children?: { (c: any, i: number): Array<ITemplate> } | { (c: any, i: number): ITemplate } | Array<ITemplate> | ITemplate;
}

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

    public set State(val: {}) {
        this.state.SetValue(val);
    }

    public get Template(): string {
return `
<div>
    <style type="text/css">
        .line-item {
            color: {{ $comp.State.fontColor }};
        }
    </style>
    {{ $comp.State.parentProp1 }}
    <${SubComp} j-parent="{ pValue: $comp.State.parentProp1, color: $comp.State.fontColor, array: $comp.State.array }">
        <header>
            HEADER {{ $parent.pValue }}
        </header>
        <content>
            <div>{{ $parent.color }} <b>{{ $data }}</b></div>
        </content>
    </${SubComp}>
</div>`;
    }

    public GetTemplate($comp: any): any {
        return [
            { component: SubComp, data: () => { return { pValue: $comp.State.parentProp1, color: $comp.State.fontColor, array: $comp.State.array }; } }
        ];
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
<header />
<div>Parent pValue is: {{ $parent.pValue }}</div>
<div j-onclick="$comp.OnDivClick" j-array="['default'].concat($state.array.valueOf())">
    <div class="line-item">Component name is: {{ $data }} - index is: {{ $index }}</div>
    <content />
</div>`;
    }

    public GetTemplate($comp: any, $state: any, $parent: any): Array<ITemplate> {
        return [
            { header: {} },
            { div: {}, children: [
                { div: {}, text: () => "Parent pValue is: " + $parent.pValue }
            ]},
            { div: { onclick: () => $comp.OnDivClick }, data: ['default', ...$state.array.valueOf()], children: (c, i) =>
                {
                    return { 
                        div: {}, children: [
                            { div: { class: "line-item" } }
                        ]
                    };
                }
            }
        ];
            /*     { div: {}, children: [
                    { div: { class: "line-item" } }
                ]}
            ] }
        ] */
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

var divElem = browser.window.document.createElement("div");
var comp = new Comp();
comp.AttachTo(divElem);
console.log(divElem.outerHTML);

var obsArr = new Observable(["first", "second", "third"]);
var test = ["prefix", ...(obsArr as any)];
console.log(test.length);