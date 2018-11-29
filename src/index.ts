import { Template } from "./template";
import { ObjectStore, Value } from './ObjectStore/objectStore';
import { div, span, ul, li, input, b, a, br, img, video, source, option, select, h1, h2, h3 } from "./DOM/elements";
// import { ObjectStoreScope } from "./ObjectStore/objectStoreScope";

export { Template, ObjectStore, Value, div, span, ul, li, input, b, a, br, img, video, source, option, select, h1, h2, h3 };

/* class Store {
    todos = ObjectStore.Create([] as Array<{ task: string, completed: boolean, assignee: string }>);

    constructor() {
        var scope = new ObjectStoreScope(() => this.report);
        scope.addListener("set", () => console.log(scope.Value));
    }

    get report() {
        if(this.todos.Root.length === 0)
            return "<none>";

        return `Next todo: ${this.todos.Root[0].task}. Progress: ${this.completedCount}/${this.todos.Root.length}`;
    }

    get completedCount() {
        return this.todos.Root.filter(t => t.completed).length;
    }

    addTodo(val: string) {
        this.todos.Push(this.todos.Root, {
            task: val,
            completed: false,
            assignee: null
        });
    }
}

var t = new Store();
t.addTodo("val 1");
t.addTodo("val 2");
t.todos.Root[0].completed = true;
t.todos.Root[1].task = "changed val 2";
t.todos.Root[0].task = "changed val 1";

class TodoView extends Template<{ task: string, completed: boolean, assignee: string }, any> {

    Template(todo: { task: string, completed: boolean, assignee: string }) {
        return li({ on: () => ({ dblclick: this.onRename.bind(this, todo) }) }, () => [
            input({ 
                props: () => ({ type: 'checkbox', checked: todo.completed }), 
                on: () => ({ change: this.onToggleCompleted.bind(this, todo) }) 
            }),
            span({ text: () => `${todo.task} ${todo.assignee || ''}` }),
        ]);
    }

    onToggleCompleted(todo: { task: string, completed: boolean, assignee: string }) {
        todo.completed = !todo.completed;
    }

    onRename(todo: { task: string, completed: boolean, assignee: string }) {
        todo.task = prompt('Task name', todo.task) || todo.task;
    }

}

var todoView = Template.ToFunction("ul", TodoView);

class TodoList extends Template<any, any> {

    constructor() {
        super("todo-list");
    }

    Template() {
        return div({}, () => [
            span({ text: () => t.report }),
            todoView({ data: () => t.todos.Root }),
            input({ props: () => ({ type: "button", value: "New Todo" }), on: () => ({ click: this.onNewTodo.bind(this) }) })
        ]);
    }

    onNewTodo() {
        t.addTodo(prompt("Enter a new todo:"));
    }

}

var list = new TodoList();
list.AttachTo(document.getElementById("container")); */

