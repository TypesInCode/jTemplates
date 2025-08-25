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

    function CreateNode<T>(data: T): INode<T> {
        return { previous: null, next: null, data };
    }

    export function Create<T>(): IList<T> {
        return {
            head: null,
            tail: null,
            size: 0
        };
    }

    export function Split<T>(list: IList<T>, length: number) {
        let index = 0;
        let node = list.head;
        while(node && index < length) {
            node = node.next;
            index++;
        }

        const retList = Create<T>();
        if(node) {
            retList.head = node;
            retList.tail = list.tail;
            retList.size = list.size - length;

            list.tail = node.previous;
            list.size = length;
            if(list.size === 0)
                list.head = null;
            else
                list.tail.next = null;

            node.previous = null;
        }

        return retList;
    }

    export function Clear<T>(list: IList<T>) {
        list.head = null;
        list.tail = null;
        list.size = 0;
    }

    export function Push<T>(list: IList<T>, data: T) {
        const node: INode<T> = CreateNode<T>(data); // { previous: null, next: null, data: data };
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

    export function PopNode<T>(list: IList<T>): INode<T> {
        if(list.size === 0)
            return null;

        const node = list.head;
        list.head = node.next;
        if(list.head)
            list.head.previous = null;

        list.size--;
        if(list.size === 0)
            list.tail = null;

        node.previous = null;
        node.next = null;

        return node;
    }

    export function Pop<T>(list: IList<T>): T {
        const node = PopNode(list);
        const data = node?.data;
        return data;
    }

    export function Add<T>(list: IList<T>, data: T) {
        const node: INode<T> = CreateNode<T>(data); // { previous: null, next: null, data: data };
        return AddNode(list, node);
    }

    export function AddNode<T>(list: IList<T>, node: INode<T>) {
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

        const newNode: INode<T> = CreateNode<T>(data); // { previous: null, next: null, data: data };
        const prevNode = node.previous;
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
        
        const newNode: INode<T> = CreateNode<T>(data); // { previous: null, next: null, data: data };
        const nextNode = node.next;
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
        
        const data = node.data;
        return data;
    }

    export function RemoveNode<T>(list: IList<T>, node: INode<T>) {
        if(list.head === node) {
            list.head = node.next;
        }
        else if(list.tail === node) {
            list.tail = node.previous;
        }
        else {
            const prev = node.previous;
            const next = node.next;
            prev.next = next;
            next.previous = prev;
        }

        node.next = node.previous = null;
        list.size--;
        if(list.size > 0)
            list.head.previous = list.tail.next = null;
    }

    export function ForEach<T>(list: IList<T>, callback: {(value: T): void}) {
        let node = list.head;
        while(node) {
            callback(node.data);
            node = node.next;
        }
    }

    export function Append<T>(appendTo: IList<T>, append: IList<T>) {
        if(append.size === 0)
            return;

        if(appendTo.size === 0) {
            appendTo.head = append.head;
            append.head = null;
            appendTo.tail = append.tail;
            append.tail = null;
            appendTo.size = append.size;
            append.size = 0;
            return;
        }

        appendTo.tail.next = append.head;
        append.head.previous = appendTo.tail;
        appendTo.tail = append.tail;
        appendTo.size += append.size;

        append.head = null;
        append.tail = null;
        append.size = 0;
    }

    export function ToNodeMap<T>(list: IList<T>, keyCallback: (data: T) => unknown) {
        const map = new Map<any, INode<T>[]>();
        for(let node = list.head; node !== null; node = node.next) {
            const key = keyCallback(node.data);
            const nodes = map.get(key);
            if(nodes === undefined)
                map.set(key, [node]);
            else
                nodes[nodes.length] = node;
        }

        return map;
    }

    export function ToListMap<T>(list: IList<T>, keyCallback: (data: T) => unknown) {
        const map = new Map<any, IList<T>>();

        let node = list.head;
        while(node !== null) {
            const key = keyCallback(node.data);
            const mapList = map.get(key) ?? List.Create();

            List.RemoveNode(list, node);
            List.AddNode(mapList, node);
            map.set(key, mapList);
            node = list.head;    
        }

        return map;
    }
}
