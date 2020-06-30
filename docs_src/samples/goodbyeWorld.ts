import { Component } from 'j-templates';
import { span, br } from 'j-templates/DOM';

class HelloGoodbyeWorld extends Component {

    public Template() {
        return [
            span({}, () => "Hello world"),
            br({}),
            span({}, () => "Goodbye world")
        ];
    }

}

var helloGoodbyeWorld = Component.ToFunction("hellogoodbye-world", null, HelloGoodbyeWorld);
Component.Attach(document.body, helloGoodbyeWorld({}));
