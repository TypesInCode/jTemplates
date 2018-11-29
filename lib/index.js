"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const template_1 = require("./template");
exports.Template = template_1.Template;
const objectStore_1 = require("./ObjectStore/objectStore");
exports.ObjectStore = objectStore_1.ObjectStore;
exports.Value = objectStore_1.Value;
const elements_1 = require("./DOM/elements");
exports.div = elements_1.div;
exports.span = elements_1.span;
exports.ul = elements_1.ul;
exports.li = elements_1.li;
exports.input = elements_1.input;
exports.b = elements_1.b;
exports.a = elements_1.a;
exports.br = elements_1.br;
exports.img = elements_1.img;
exports.video = elements_1.video;
exports.source = elements_1.source;
exports.option = elements_1.option;
exports.select = elements_1.select;
exports.h1 = elements_1.h1;
exports.h2 = elements_1.h2;
exports.h3 = elements_1.h3;
const objectStoreScope_1 = require("./ObjectStore/objectStoreScope");
class Store {
    constructor() {
        this.todos = objectStore_1.ObjectStore.Create([]);
        var scope = new objectStoreScope_1.ObjectStoreScope(() => this.report);
        scope.addListener("set", () => console.log(scope.Value));
    }
    get report() {
        if (this.todos.Root.length === 0)
            return "<none>";
        return `Next todo: ${this.todos.Root[0].task}. Progress: ${this.completedCount}/${this.todos.Root.length}`;
    }
    get completedCount() {
        return this.todos.Root.filter(t => t.completed).length;
    }
    addTodo(val) {
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
class TodoView extends template_1.Template {
    Template(todo) {
        return elements_1.li({ on: () => ({ dblclick: this.onRename.bind(this, todo) }) }, () => [
            elements_1.input({
                props: () => ({ type: 'checkbox', checked: todo.completed }),
                on: () => ({ change: this.onToggleCompleted.bind(this, todo) })
            }),
            elements_1.span({ text: () => `${todo.task} ${todo.assignee || ''}` }),
        ]);
    }
    onToggleCompleted(todo) {
        todo.completed = !todo.completed;
    }
    onRename(todo) {
        todo.task = prompt('Task name', todo.task) || todo.task;
    }
}
var todoView = template_1.Template.ToFunction("ul", TodoView);
class TodoList extends template_1.Template {
    constructor() {
        super("todo-list");
    }
    Template() {
        return elements_1.div({}, () => [
            elements_1.span({ text: () => t.report }),
            todoView({ data: () => t.todos.Root }),
            elements_1.input({ props: () => ({ type: "button", value: "New Todo" }), on: () => ({ click: this.onNewTodo.bind(this) }) })
        ]);
    }
    onNewTodo() {
        t.addTodo(prompt("Enter a new todo:"));
    }
}
var list = new TodoList();
list.AttachTo(document.getElementById("container"));
//# sourceMappingURL=index.js.map