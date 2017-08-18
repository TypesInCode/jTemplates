import browser from "./browser";

class Template {
    private documentFragment: DocumentFragment;
    private attachedTo: Node;
    private elements: Array<Node>;

    public get DocumentFragment() {
        return this.documentFragment;
    }

    public get Attached() {
        return !!this.attachedTo;
    }

    constructor(documentFragment: DocumentFragment) {
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

    public OverwriteChildElements(childFragments: { [name: string]: DocumentFragment }) {
        if(this.Attached)
            throw "Can't set child elements while attached";

        for(var key in childFragments) {
            var elements = this.DocumentFragment.querySelectorAll(key);
            for(var x=0; x<elements.length; x++) {
                elements[x].innerHTML = "";
                elements[x].appendChild(childFragments[key]);
            }
        }
    }
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