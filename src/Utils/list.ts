export interface INode<T> {
    previous: INode<T>;
    next: INode<T>;
    data: T;
}

export interface IList<T> {
    head: INode<T>;
    tail: INode<T>;
    size: number;
}

export namespace List {

    export function Create<T>(): IList<T> {
        return {
            head: null,
            tail: null,
            size: 0
        };
    }

    export function Clear<T>(list: IList<T>) {
        list.head = null;
        list.tail = null;
        list.size = 0;
    }

    export function Push<T>(list: IList<T>, data: T) {
        var node: INode<T> = { previous: null, next: null, data: data };
        if(list.size === 0) {
            list.head = node;
            list.tail = node;
            list.size = 1;
        }
        else {
            node.next = list.head;
            list.head.previous = node;
            list.head = node;
            list.size++;
        }

        return node;
    }

    export function Pop<T>(list: IList<T>): T {
        if(list.size === 0)
            return null;

        var node = list.head;
        list.head = node.next;
        if(list.head)
            list.head.previous = null;

        list.size--;
        if(list.size === 0)
            list.tail = null;

        return node.data;
    }

    export function Add<T>(list: IList<T>, data: T) {
        var node: INode<T> = { previous: null, next: null, data: data };
        if(list.size === 0) {
            list.head = node;
            list.tail = node;
            list.size = 1;
        }
        else {
            node.previous = list.tail;
            list.tail.next = node;
            list.tail = node;
            list.size++;
        }

        return node;
    }

    export function AddBefore<T>(list: IList<T>, node: INode<T>, data: T) {
        if(!node)
            return List.Add<T>(list, data);

        var newNode: INode<T> = { previous: null, next: null, data: data };
        var prevNode = node.previous;
        newNode.next = node;
        node.previous = newNode;

        if(list.head === node)
            list.head = newNode;

        if(prevNode) {
            prevNode.next = newNode;
            newNode.previous = prevNode;
        }

        list.size++;
        return newNode;
    }

    export function AddAfter<T>(list: IList<T>, node: INode<T>, data: T) {
        if(!node)
            return List.Push<T>(list, data);
        
        var newNode: INode<T> = { previous: null, next: null, data: data };
        var nextNode = node.next;
        node.next = newNode;
        newNode.previous = node;

        if(list.tail === node)
            list.tail = newNode;

        if(nextNode) {
            nextNode.previous = newNode;
            newNode.next = nextNode;
        }

        list.size++;
        return newNode;
    }

    export function Remove<T>(list: IList<T>): T {
        if(list.size === 0)
            return null;

        var node = list.tail;
        list.tail = node.previous;
        if(list.tail)
            list.tail.next = null;
            
        list.size--;
        if(list.size === 0)
            list.head = null;
        
        return node.data;
    }

    export function ForEach<T>(list: IList<T>, callback: {(value: T): void}) {
        var node = list.head;
        while(node) {
            callback(node.data);
            node = node.next;
        }
    }
}