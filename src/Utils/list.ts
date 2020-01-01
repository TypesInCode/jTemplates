export class List<T> {

    private head: Node<T> = null;
    private tail: Node<T> = null;
    private size = 0;

    get Head() {
        return this.head.Data;
    }

    get Tail() {
        return this.tail.Data;
    }

    get Size() {
        return this.size;
    }

    public Push(data: T) {
        var node = new Node(data);
        if(this.size === 0) {
            this.head = node;
            this.tail = node;
            this.size = 1;
        }
        else {
            node.Next = this.head;
            node.Next.Previous = node;
            this.head = node;
            this.size++;
        }
    }

    public PopEnd(): T {
        if(this.size === 0)
            return null;

        var node = this.tail;
        this.tail = node.Previous;
        if(this.tail)
            this.tail.Next = null;
            
        this.size--;
        if(this.size === 0)
            this.head = null;
        
        return node.Data;
    }

    public ForEach(callback: {(value: T): void}) {
        var node = this.head;
        while(node) {
            callback(node.Data);
            node = node.Next;
        }
    }

}

class Node<T> {

    private previous: Node<T> = null;
    private next: Node<T> = null;

    get Data() {
        return this.data;
    }

    get Previous() {
        return this.previous;
    }

    set Previous(val: Node<T>) {
        this.previous = val;
    }

    get Next() {
        return this.next;
    }

    set Next(val: Node<T>) {
        this.next = val;
    }

    constructor(private data: T) { }
}