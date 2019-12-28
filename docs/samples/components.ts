// 'Component' is the base type required for components. 
// 'NodeRef' is the base type for all types used in template definitions.
import { Component, NodeRef } from 'j-templates';
// div, h1 are template element functions
import { div, h1 } from 'j-templates/DOM';

// Type definition for the data this 'Component' can receive from a 
// parent 'Component'
interface IData {
    title: string;
}

// Type definition for the template definitions this 'Component' accepts 
// from a parent 'Component'
interface ITemplates {
    body: () => NodeRef | NodeRef[];
}

// Type definition for the events this `Component` supports. A `Component` does 
// not support standard DOM events and must define the events that can be 
// listened for by a parent `Component`. The type of the interface property 
// defines the type of the parameter passed when the event fires. Void indicates 
// no parameter is passed to the event.
interface IEvents {
    headerClick: void;
}

// Class definition extending Component. Component accepts three optional 
// generic types defining: Data, Templates, and Events.
class MyComponent extends Component<IData, ITemplates, IEvents> {
    // Store definition
    _store = new StoreSync({ headerToggled: false });
    // Scope definition
    _headerClassScope = this._store.Root.Scope(root => {
        return root.headerToggled ? 'toggled' : 'not-toggled';
    });

    // getter to clean up accessing Scope value
    get HeaderClass() {
        return this._headerClassScope.Value;
    }

    // Component.Template definition function
    public Template() {
        return [
            // h1 element
            h1({
                // dynamic props binding. If a function is not used then a static
                // binding is created.
                // Type maps 1to1 to Partial<HTMLElement> type
                props: () => ({
                    className: this.HeaderClass
                }),
                // static on binding
                // IEvents type
                on: { 
                    click: () => {
                        // this.Fire fires 'Component' events
                        this.Fire("headerClick");
                    }
                },
                // dynamic text binding
                // sets the text of the element
                // this.Data contains data passed from the parent 'Component'
                text: () => `${this.Data.title} - ${this.HeaderClass}`
            }),
            div({ props: { className: "body" } }, () => 
                // Templates passed from a parent component are available through
                // the this.Templates property
                this.Templates.body()
            )
        ]
    }

    // Component.Destroy to clean up Component
    public Destroy() {
        super.Destroy();
        this._headerClassScope.Destroy();
        this._store.Destroy();
    }

}

// Convert Component to function to be referenced in other templates
var myComponent = Component.ToFunction("my-component", null, MyComponent);

class RootComponent extends Component {

    _state = new StoreSync({ inputValue: "" });
    _inputValueScope = this._state.Root.Scope(root => root.inputValue);
    get InputValue() {
        return this._inputValueScope.Value;
    }

    public Template() {
        return [
            input({ props: () => ({ value: this.InputValue }) }),
            myComponent({
                data: () => ({ title: this.InputValue })
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