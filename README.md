# j-templates
Type-safe templating engine for the browser written in TypeScript.
## Install
```
npm install --save-dev j-templates
```
## Hello World
```
import { Component } from 'j-templates';
import { div } from 'j-templates/elements';

class HelloWorld extends Component {

    public Template() {
        return div({ text: "Hello world" });
    }

}

var helloWorld = Component.ToFunction("hello-world", null, HelloWorld);
Component.Attach(document.body, hellowWorld({}));
```
### Resulting HTML
```
<hello-world>
    <div>Hello world</div>
</hello-world>
```
## State Management
### Store
The library provides two store types: `StoreSync` and `StoreAsync`. The only difference is `StoreAsync` uses a WebWorker to calculate changes to the state of the Store.
### Scope
A `Scope` is used to observe changes made to the state of a store.
### Example
```
import { StoreSync } from 'j-templates/store';

var store = new StoreSync({ 
    firstProperty: 'old value',
    secondProperty: 'second old value'
});
// store.Root is a scope representing the root of the store
var rootScope = store.Root;
// rootScope.Value gets the current value of the scope
console.log(rootScope.Value.firstProperty);
// outputs: "old value"

// rootScope.Scope creates a scope from the current
// value of the scope.
var childScope = rootScope.Scope(parent => {
    return `${parent.firstProperty} - ${parent.secondProperty}`;
});

// 'set' listener fires when any Store value being tracked by the 
// scope changes
childScope.addListener('set', () => {
    console.log(childScope.Value); 
    // outputs: 'new value - second new value'
    // outputs: 'merged value - second new value'
});

// store.Update overwrites the the root of the store.
// Returns a promise that resolves when the update is complete.
store.Update({ 
    firstProperty: 'new value',
    secondProperty: 'second new value'
}).then(() => console.log('Update complete'));

// store.Merge allows for a partial value to be written to
// the root of the store.
// Also returns a promise that resolves when the merge is complete
store.Merge({
    firstProperty: 'merged value'
}).then(() => console.log('Merge complete'));
```
### Tracking by ID
A store can be passed an ID function to compute unique IDs on stored objects. If a second object with the same ID is stored it will overwrite the first. Objects with IDs can also be stored to and retrieved directly from a store.