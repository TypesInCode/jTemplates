class HelloWorld extends Component {

    public Template() {
        return div({ text: "Hello world" });
    }

}

var helloWorld = Component.ToFunction("hello-world", null, HelloWorld);
Component.Attach(document.getElementById("helloWorld-output"), helloWorld({}));
