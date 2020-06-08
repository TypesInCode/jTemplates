export interface INode<T> {
    previous: INode<T>;
    next: INode<T>;
    data: T;
}

export class List<T> {

    private head: INode<T> = null;
    private tail: INode<T> = null;
    private size = 0;

    get HeadNode() {
        return this.head;
    }

    get Head() {
        return this.head && this.head.data;
    }

    get TailNode() {
        return this.tail;
    }

    get Tail() {
        return this.tail && this.tail.data;
    }

    get Size() {
        return this.size;
    }

    public Clear() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    public Push(data: T) {
        var node: INode<T> = { previous: null, next: null, data: data };
        if(this.size === 0) {
            this.head = node;
            this.tail = node;
            this.size = 1;
        }
        else {
            node.next = this.head;
            this.head.previous = node;
            this.head = node;
            this.size++;
        }

        return node;
    }

    public Pop(): T {
        if(this.size === 0)
            return null;

        var node = this.head;
        this.head = node.next;
        if(this.head)
            this.head.previous = null;

        this.size--;
        if(this.size === 0)
            this.tail = null;

        return node.data;
    }

    public Add(data: T) {
        var node: INode<T> = { previous: null, next: null, data: data };
        if(this.size === 0) {
            this.head = node;
            this.tail = node;
            this.size = 1;
        }
        else {
            node.previous = this.tail;
            this.tail.next = node;
            this.tail = node;
            this.size++;
        }

        return node;
    }

    public AddBefore(node: INode<T>, data: T) {
        if(!node)
            return this.Add(data);

        var newNode: INode<T> = { previous: null, next: null, data: data };
        var prevNode = node.previous;
        newNode.next = node;
        node.previous = newNode;

        if(this.head === node)
            this.head = newNode;

        if(prevNode) {
            prevNode.next = newNode;
            newNode.previous = prevNode;
        }

        this.size++;
        return newNode;
    }

    public AddAfter(node: INode<T>, data: T) {
        if(!node)
            return this.Push(data);
        
        var newNode: INode<T> = { previous: null, next: null, data: data };
        var nextNode = node.next;
        node.next = newNode;
        newNode.previous = node;

        if(this.tail === node)
            this.tail = newNode;

        if(nextNode) {
            nextNode.previous = newNode;
            newNode.next = nextNode;
        }

        this.size++;
        return newNode;
    }

    public Remove(): T {
        if(this.size === 0)
            return null;

        var node = this.tail;
        this.tail = node.previous;
        if(this.tail)
            this.tail.next = null;
            
        this.size--;
        if(this.size === 0)
            this.head = null;
        
        return node.data;
    }

    public ForEach(callback: {(value: T): void}) {
        var node = this.head;
        while(node) {
            callback(node.data);
            node = node.next;
        }
    }

}