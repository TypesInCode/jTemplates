# j-templates
Type-safe templating for the browser.
## Install
```
npm install --save-dev j-templates
```
## Hello World
```typescript
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class HelloWorld extends Component {

    public Template() {
        return div({}, () => "Hello world");
    }

}

var helloWorld = Component.ToFunction("hello-world", null, HelloWorld);
Component.Attach(document.body, hellowWorld({}));
```
### Resulting HTML
```html
<hello-world>
    <div>Hello world</div>
</hello-world>
```