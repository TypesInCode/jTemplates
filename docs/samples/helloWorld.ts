import { Component } from 'j-templates';
import { span } from 'j-templates/DOM';

class HelloWorld extends Component {

    public Template() {
        return span({}, () => "Hello world");
    }

}

var helloWorld = Component.ToFunction("hello-world", null, HelloWorld);
Component.Attach(document.body, helloWorld({}));
