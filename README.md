# j-templates
Type-safe templating engine for the browser written in TypeScript.
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
        return div({ text: "Hello world" });
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
## State Management
### Store
The library provides two store types: `StoreSync` and `StoreAsync`. The only difference is `StoreAsync` uses a WebWorker to calculate changes to the state of the Store.
### Scope
A `Scope` is used to observe changes made to the state of a store and calculate a new value from that state.
### Example
```typescript
import { StoreSync, Scope } from 'j-templates/Store';

var store = new StoreSync({ 
    firstProperty: 'old value',
    secondProperty: 'second old value'
});

// store.Root is a Scope watching the root of the store
var rootScope = store.Root;

// rootScope.Value gets the current value of the Scope
console.log(rootScope.Value.firstProperty);
// outputs: "old value"

// A scope can be created by passing a value callback
var dependentScope = new Scope(() => {
    return `${rootScope.Value.firstProperty} - ${rootScope.Value.secondProperty}`;
});

// OR rootScope.Scope can be used as a shorthand to create a dependent scope
var childScope = rootScope.Scope(rootValue => {
    return `${parent.firstProperty} - ${parent.secondProperty}`;
});

// 'set' listener fires when any value being tracked by the 
// scope changes
childScope.addListener('set', () => {
    console.log(childScope.Value); 
    // outputs: 'new value - second new value'
    // ...
    // outputs: 'merged value - second new value'
});

// store.Update overwrites the the root of the Store.
// Returns a promise that resolves when the update is complete.
store.Update({ 
    firstProperty: 'new value',
    secondProperty: 'second new value'
}).then(() => console.log('Update complete'));

// store.Merge allows for a Partial<> value to be written to the root of the Store.
// Also returns a promise that resolves when the merge is complete
store.Merge({
    firstProperty: 'merged value'
}).then(() => console.log('Merge complete'));

// It's important to call Destroy() to clean up dependencies when you're done
store.Destroy();
dependentScope.Destroy();
childScope.Destroy();
```
### Tracking by ID
A store can be passed an ID function to compute unique IDs on stored objects. If a second object with the same ID is stored it will overwrite the first. Objects with IDs can also be stored to and retrieved directly from a store.
```typescript
import { StoreSync } from 'j-templates/Store';

// Second parameter to Store contructor is a callback to calculate object Ids
var store = new StoreSync({}, (obj: any) => obj._id);

store.Write({ 
    _id: 'very-unique-id',
    property: 'useful data'
}).then(() => {
    var obj = store.Get<{ _id: string, property: string }>('very-unique-id');
    console.log(obj.property)
    // outputs: 'useful data'
});
```

