import browser from "./browser";
import Emitter from "../emitter";

class Template { // extends Emitter {
    private documentFragment: DocumentFragment;
    private attachedTo: Node;
    private elements: Array<Node>;

    public get DocumentFragment() {
        return this.documentFragment;
    }

    public get Attached() {
        return !!this.attachedTo;
    }

    public get AttachedTo() {
        return this.attachedTo;
    }

    constructor(documentFragment: DocumentFragment) {
        // super();
        this.documentFragment = documentFragment;
        this.elements = new Array<Node>(this.documentFragment.childNodes.length);
        for(var x=0; x<this.documentFragment.childNodes.length; x++) {
            this.elements.push(this.documentFragment.childNodes[x]);
        }
    }

    public AttachTo(element: Node) {
        if( this.attachedTo )
            this.Detach();
        
        this.attachedTo = element;
        element.appendChild(this.documentFragment);
    }

    public Detach() {
        if(!this.Attached)
            return;
        
        this.attachedTo = null;
        this.elements.forEach(c => 
            this.documentFragment.appendChild(c));
    }

    public Clone(): Template {
        if(this.Attached)
            throw "Template cannot be cloned while attached";
        
        var fragment = this.documentFragment.cloneNode(true) as DocumentFragment;
        return new Template(fragment);
    }

    /* public OverwriteChildElements(childFragments: { [name: string]: DocumentFragment | Template }) {
        if(this.Attached)
            throw "Can't overwrite child elements while attached";

        for(var key in childFragments) {
            var element = this.DocumentFragment.querySelector(key);
            if(element) {
                element.innerHTML = "";
                if(childFragments[key] instanceof Template)
                    (childFragments[key] as Template).AttachTo(element)
                else
                    element.appendChild(childFragments[key] as DocumentFragment);
            }
        }
    } */
}

namespace Template {
    export function Create(template: Node | string | Template): Template {
        if(template instanceof Template)
            return template.Clone();
        
        var frag = browser.createDocumentFragment(template);
        return new Template(frag);
    }
}

export default Template;