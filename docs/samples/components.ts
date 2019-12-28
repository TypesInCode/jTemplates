import { Component, NodeRef } from 'j-templates';
import { div, h1, input } from 'j-templates/DOM';

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
    _state = new StoreSync({ headerToggled: false });
    _headerClassScope = this._state.Root.Scope(root => {
        return root.headerToggled ? 'toggled' : 'not-toggled';
    });

    get HeaderClass() {
        return this._headerClassScope.Value;
    }

    public Template() {
        return [
            h1({
                props: () => ({
                    className: this.HeaderClass
                }),
                on: { 
                    click: () => {
                        this._state.Merge({ headerToggled: !this._state.Root.Value.headerToggled });
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

    public Destroy() {
        super.Destroy();
        this._headerClassScope.Destroy();
        this._state.Destroy();
    }

}

var myComponent = Component.ToFunction("my-component", null, MyComponent);

class RootComponent extends Component {

    _state = new StoreSync({ inputValue: "" });
    _inputValueScope = this._state.Root.Scope(root => root.inputValue);
    get InputValue() {
        return this._inputValueScope.Value;
    }

    public Template() {
        return [
            input({ 
                props: () => ({
                    placeholder: "Enter title...",
                    value: this.InputValue 
                }), 
                on: { keyup: (e) => this._state.Merge({ inputValue: e.target.value }) } 
            }),
            myComponent({
                data: () => ({ title: this.InputValue }),
                on: { headerClick: () => this._state.Merge({ inputValue: "" }) }
            }, {
                body: () =>
                    div({ text: "passed from RootComponent" })
            })
        ]
    }

    public Destroy() {
        super.Destroy();
        this._state.Destroy();
        this._inputValueScope.Destroy();
    }
}

var rootComponent = Component.ToFunction("root-component", null, RootComponent);
Component.Attach(document.body, rootComponent({}));