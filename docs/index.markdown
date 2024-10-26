---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: home
---

## Hello World
``` typescript
import { Component, NodeRefTypes } from "j-templates";
import { div } from "j-templates/DOM";

class App extends Component {
  Template(): NodeRefTypes | NodeRefTypes[] {
    return div({}, () => "Hello world!");
  }
}

const app = Component.ToFunction("app-component", undefined, App);
Component.Attach(document.getElementById("app") as any, app({}));
```
