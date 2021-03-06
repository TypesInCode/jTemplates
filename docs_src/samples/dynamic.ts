import { Component } from 'j-templates';
import { div, input, text } from 'j-templates/DOM';
import { Store } from 'j-templates/Store';

class HelloWorld extends Component {

    state = new Store({ inputValue: "Hello world" });
    inputScope = this.state.Root.Scope(root => root.inputValue);

    get State() {
        return this.state.Root.Value;
    }

    set State(val: Partial<{ inputValue: string }>) {
        this.state.Merge(val);
    }

    get InputValue() {
        return this.inputScope.Value;
    }

    public Template() {
        return [
            input({ 
                props: () => ({ 
                    type: "text",
                    value: this.InputValue
                }), 
                on: {
                    keyup: (e: any) => this.State = { inputValue: e.target.value } 
                } 
            }),
            div({}, () => this.InputValue)
        ]
    }

    public Destroy() {
        super.Destroy();
        this.state.Destroy();
        this.inputScope.Destroy();
    }

}

var helloWorld = Component.ToFunction("hello-world", null, HelloWorld);
Component.Attach(document.body, helloWorld({}));