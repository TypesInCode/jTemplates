import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class HelloWorld extends Component {

    public Template() {
        return div({ text: "Hello world" });
    }

}

var helloWorld = Component.ToFunction("hello-world", null, HelloWorld);
Component.Attach(document.body, helloWorld({}));
