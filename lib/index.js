"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const template_1 = require("./Template/template");
exports.Template = template_1.Template;
exports.Component = template_1.Component;
const scope_1 = require("./Store/scope/scope");
exports.Scope = scope_1.Scope;
const storeAsync_1 = require("./Store/storeAsync");
exports.StoreAsync = storeAsync_1.StoreAsync;
const storeSync_1 = require("./Store/storeSync");
exports.StoreSync = storeSync_1.StoreSync;
const store_1 = require("./Store/store/store");
exports.Store = store_1.Store;
exports.AbstractStore = store_1.AbstractStore;
const storeReader_1 = require("./Store/store/storeReader");
exports.StoreReader = storeReader_1.StoreReader;
const storeWriter_1 = require("./Store/store/storeWriter");
exports.StoreWriter = storeWriter_1.StoreWriter;
const elements_1 = require("./DOM/elements");
class TodoStore extends storeAsync_1.StoreAsync {
    constructor() {
        super({ loading: false, todos: [], assignees: [] }, (val) => val.id);
        this.nextId = 100;
        this.todoQuery = this.Query("todos", [], (reader, writer) => __awaiter(this, void 0, void 0, function* () {
            return reader.Root.todos;
        }));
        this.assigneeQuery = this.Query("assignees", [], (reader) => __awaiter(this, void 0, void 0, function* () {
            return reader.Root.assignees;
        }));
        this.loadingQuery = this.Query("loading", false, (reader) => __awaiter(this, void 0, void 0, function* () {
            return reader.Root.loading;
        }));
        this.completedScope = this.todoQuery.Scope(root => {
            return root.filter(t => t.completed).length;
        });
        this.reportScope = this.todoQuery.Scope(root => {
            if (!root || root.length === 0)
                return "<none>";
            var nextTask = root.find((val) => !val.completed);
            return `Next todo: ${nextTask ? nextTask.task : 'none'}. Progress: ${this.CompletedCount}/${root.length}`;
        });
        this.smallReportScope = this.reportScope.Scope(report => {
            return report.replace(/[a-z]{3}[\s:]/gi, " ");
        });
    }
    get Assignees() {
        return this.assigneeQuery.Value;
    }
    get ToDos() {
        return this.todoQuery.Value;
    }
    get Report() {
        return this.reportScope.Value;
    }
    get SmallReport() {
        return this.smallReportScope.Value;
    }
    get CompletedCount() {
        return this.completedScope.Value;
    }
    get Loading() {
        return this.loadingQuery.Value;
    }
    addTodo(val) {
        var nextTodo = {
            id: this.nextId++,
            task: val,
            completed: false,
            deleted: false,
            assignee: null
        };
        this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
            yield writer.Push(reader.Root.todos, nextTodo);
        }));
    }
    removeTodo(todo) {
        this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
            var index = reader.Root.todos.findIndex(t => t.id === todo.id);
            writer.Splice(reader.Root.todos, index, 1);
        }));
    }
    replaceTodos() {
        this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
            var newTodos = [];
            for (var x = 0; x < 500; x++) {
                newTodos.push({
                    id: this.nextId++,
                    task: `New todo ${this.nextId}`,
                    completed: (Math.random() >= .5),
                    deleted: false,
                    assignee: null
                });
            }
            yield writer.Update(reader.Root.todos, newTodos);
        }));
    }
    addAssignee(name) {
        var nextAssignee = {
            id: 100000 + this.nextId++,
            name: name
        };
        this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
            yield writer.Push(reader.Root.assignees, nextAssignee);
        }));
    }
    setAssignee(todoId, assigneeId) {
        this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
            var todo = reader.Get(todoId.toString());
            var assignee = reader.Get(assigneeId.toString());
            yield writer.Update(todo, (todo) => { todo.assignee = assignee; });
        }));
    }
    resetIds() {
        this.nextId = 100;
    }
}
var t = new TodoStore();
t.addTodo("val 1");
t.addTodo("val 2");
t.addAssignee("Bart Simpson");
t.addAssignee("Homer Simpson");
class TodoView extends template_1.Template {
    get DefaultTemplates() {
        return {
            remove: (data, index) => elements_1.span({ text: "" }),
            append: []
        };
    }
    Template(todo, index) {
        return elements_1.li({ on: () => ({ dblclick: this.onRename.bind(this, todo) }) }, () => [
            elements_1.input({
                props: () => ({ type: 'checkbox', checked: todo.completed }),
                on: { change: this.onToggleCompleted.bind(this, todo) }
            }),
            elements_1.span({
                text: () => `${todo.task} ${(todo.assignee && todo.assignee.name) || ''}`,
                props: {
                    style: { color: "red" }
                }
            }),
            elements_1.span({}, this.Templates.remove(todo, index)),
            elements_1.input({
                props: () => ({ type: "input", value: todo.assignee && todo.assignee.id || '' }),
                on: { keyup: this.onAssigneeIdChange.bind(this, todo) }
            }),
            elements_1.span({}, this.Templates.append)
        ]);
    }
    onToggleCompleted(todo) {
        var store = this.Injector.Get(store_1.AbstractStore);
        store.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
            yield writer.Update(todo, (todo) => { todo.completed = !todo.completed; });
        }));
    }
    onRename(todo) {
        var store = this.Injector.Get(store_1.AbstractStore);
        store.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
            writer.Update(todo, (todo) => todo.task = prompt('Task name', todo.task) || todo.task);
        }));
    }
    onAssigneeIdChange(todo, event) {
        var value = event.target.value;
        var id = parseInt(value);
        if (!isNaN(id)) {
            var store = this.Injector.Get(TodoStore);
            store.setAssignee(todo.id, id);
        }
    }
}
var todoView = template_1.Template.ToFunction("ul", TodoView);
class TodoList extends template_1.Template {
    constructor() {
        super("todo-list");
        this.Injector.Set(store_1.AbstractStore, t);
    }
    Template() {
        return elements_1.div({ props: { style: { color: "red" } } }, [
            elements_1.div({ text: () => t.Report }),
            elements_1.div({ text: () => t.SmallReport }),
            todoView({ key: (val) => val.id, data: () => t.ToDos }, {
                remove: (data) => elements_1.input({
                    props: { type: "button", value: "delete" },
                    on: { click: this.onRemoveTodo.bind(this, data) }
                }),
                append: [
                    elements_1.span({ text: "appended" }),
                    elements_1.span({ text: "next" })
                ]
            }),
            elements_1.div({ text: () => t.Loading ? 'Loading...' : '' }),
            elements_1.input({
                props: { type: "button", value: "New Todo" },
                on: { click: this.onNewTodo.bind(this) }
            }),
            elements_1.input({
                props: { type: "button", value: "Replace Todos" },
                on: { click: this.onReplaceTodos.bind(this) }
            }),
            elements_1.input({
                props: { type: "button", value: "Reset IDs" },
                on: { click: this.onResetIds.bind(this) }
            }),
            elements_1.div({ key: (val) => val.id, data: () => t.Assignees }, (assignee) => elements_1.div({
                text: () => `${assignee.id} - ${assignee.name}`,
                on: { dblclick: this.onAssigneeDblClick.bind(this, assignee) }
            }))
        ]);
    }
    onNewTodo() {
        t.addTodo(prompt("Enter a new todo:"));
    }
    onRemoveTodo(data) {
        t.removeTodo(data);
    }
    onReplaceTodos() {
        t.replaceTodos();
    }
    onResetIds() {
        t.resetIds();
    }
    onAssigneeDblClick(assignee) {
        var store = this.Injector.Get(store_1.AbstractStore);
        store.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
            yield writer.Update(assignee, (ass) => { ass.name = prompt("New Name", assignee.name) || assignee.name; });
        }));
    }
}
var list = new TodoList();
list.AttachTo(document.getElementById("container"));
//# sourceMappingURL=index.js.map