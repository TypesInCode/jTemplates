import { Component } from 'j-templates';
import { div, input, text } from 'j-templates/DOM';
import { Store, Scope } from 'j-templates/Utils';

class HelloWorld extends Component {

    @Store()
    State: Partial<{ inputValue: string }> = { inputValue: "Hello world" };

    @Scope()
    get InputValue() {
        return this.State.inputValue
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
            div({}, () => text(() => this.InputValue)),
        ]
    }

}

var helloWorld = Component.ToFunction("hello-world", null, HelloWorld);
Component.Attach(document.body, helloWorld({}));