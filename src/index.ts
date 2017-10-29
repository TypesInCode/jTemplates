import browser from "./DOM/browser";
import Observable from "./Observable/observable";
import Component from "./DOM/Component/component";

/* var date: Date = null;

class MyComp extends Component {
    private state = Observable.Create({
        Prop1: "test",
        Prop2: "blue",
        Class: "garbage-man",
        Font: "verdana",
        Arr: ["obs1", "obs2"],
        Component: SubComp
    });

    public get State() {
        return this.state;
    }
    
    public get Template() {
        return [
            { style: { type: "text/css"}, children: () => {
                return { text: () => `.garbage-man { color: ${this.State.Prop2}; }` }
            } },
            { div: { className: () => this.State.Class, style: { fontFamily: () => this.State.Font } }, data: () => this.State.Arr, 
                on: { click: () => (e: any) => alert("click") }, children: (c: string, i: number) => {
                return { 
                    div: {}, children: [
                        { text: () => `value is: ${c}, index is ${i}` },
                        { div: {}, component: () => this.state.Component, data: c }
                    ] };
                } 
            },
            { div: {}, component: () => this.state.Component, data: () => this.state.Prop1, templates: {
                header: { div: {}, children: { text: () => `header of MyComp ${this.State.Class}` } }
            } }
        ];
    }

    protected Updating() {
        date = new Date();
        console.log("updating");
    }

    protected Updated() {
        var date2 = new Date();
        console.log("updated " + (date2.getTime() - date.getTime()));
    }
}

class SubComp extends Component {
    private state = Observable.Create({
        Name: "NAME"
    })

    public get DefaultTemplates() {
        return {
            header: (): any => null
        }
    }

    public get Template() {
        return {
            div: {}, children: [
                { text: "SubComp Header" },
                { header: {}, children: this.Templates.header() },
                { text: () => `Subcomp name: ${this.state.Name}` }
            ]
        };
    }

    public SetParentData(data: any) {
        this.state.Name = data;
    }
}

class SubComp2 extends Component {
    private state = Observable.Create({
        Name: "NAME"
    });

    public get DefaultTemplates() {
        return {
            header: (): any => null
        }
    }

    public get Template() {
        return {
            div: {}, children: [
                { text: "SubComp2 Header" },
                { header: {} },
                { text: () => `Subcomp2 name: ${this.state.Name}` }
            ]
        };
    }

    public SetParentData(data: any) {
        this.state.Name = data;
    }
}

(browser.window as any).MyComp = MyComp;
(browser.window as any).SubComp = SubComp;
(browser.window as any).SubComp2 = SubComp2; */

export { Observable, Component };