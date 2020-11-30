/**
 * List node interface
 */
export interface INode<T> {
    previous: INode<T>;
    next: INode<T>;
    data: T;
}

/**
 * Linked list implementation
 */
export class List<T> {

    private head: INode<T> = null;
    private tail: INode<T> = null;
    private size = 0;

    /**
     * Head node of the list
     */
    get HeadNode() {
        return this.head;
    }

    /**
     * Head data of the list
     */
    get Head() {
        return this.head && this.head.data;
    }

    /**
     * Tail node of the list
     */
    get TailNode() {
        return this.tail;
    }

    /**
     * Tail data of the list
     */
    get Tail() {
        return this.tail && this.tail.data;
    }

    /**
     * Size of the list
     */
    get Size() {
        return this.size;
    }

    /**
     * Clear all nodes from the list
     */
    public Clear() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    /**
     * Push an new node as the head of the list
     * 
     * @param data Value to add
     */
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

    /**
     * Pop a node from the head of the list and return its data.
     */
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

    /**
     * Add a new node to the tail of the list
     * 
     * @param data Value to add
     */    
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

    /**
     * Add a new node before another node in the list with the given data
     * 
     * @param node Node in the current list
     * @param data Data to add before the passed node
     */
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

    /**
     * Add a new node after another node in the list with the given data
     * 
     * @param node Node in the current list
     * @param data Data to add after the given node
     */
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

    /**
     * Remove the tail node from the list and return its data
     */
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

    /**
     * Iterate over every node in the list
     * 
     * @param callback Called for each node in the list with its data
     */
    public ForEach(callback: {(value: T): void}) {
        var node = this.head;
        while(node) {
            callback(node.data);
            node = node.next;
        }
    }

}