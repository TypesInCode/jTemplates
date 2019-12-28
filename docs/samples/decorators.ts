import { Component, NodeRef } from 'j-templates';
import { div, h1, input } from 'j-templates/DOM';
import { Store, Scope } from 'j-templates/Utils';

interface IData {
    title: string;
}

interface ITemplates {
    body: () => NodeRef | NodeRef[];
}

interface IEvents {
    headerClick: void;
}

class MyComponent extends Component<IData, ITemplates, IEvents> {

    @Store()
    _state = { headerToggled: false };

    @Scope()
    get HeaderClass() {
        return this._state.headerToggled ? 'toggled' : 'not-toggled'
    }

    public Template() {
        return [
            h1({
                props: () => ({
                    className: this.HeaderClass
                }),
                on: { 
                    click: () => {
                        this._state = { headerToggled: !this._state.headerToggled };
                        this.Fire("headerClick");
                    }
                },
                text: () => `${this.Data.title} - ${this.HeaderClass}`
            }),
            div({ props: { className: "body" } }, () => 
                this.Templates.body()
            )
        ]
    }
}

var myComponent = Component.ToFunction("my-component", null, MyComponent);

class RootComponent extends Component {

    @Store()
    _state = { inputValue: "" };
    
    @Scope()
    get InputValue() {
        return this._state.inputValue;
    }

    public Template() {
        return [
            input({ 
                props: () => ({
                    placeholder: "Enter title...",
                    value: this.InputValue 
                }), 
                on: { keyup: (e) => this._state = { inputValue: e.target.value } } 
            }),
            myComponent({
                data: () => ({ title: this.InputValue }),
                on: { headerClick: () => this._state = { inputValue: "" } }
            }, {
                body: () =>
                    div({ text: "passed from RootComponent" })
            })
        ]
    }
}

var rootComponent = Component.ToFunction("root-component", null, RootComponent);
Component.Attach(document.body, rootComponent({}));