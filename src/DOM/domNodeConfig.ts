import { wndw } from "./window";
import { INodeConfig } from "../Node/nodeConfig";
import { List } from "../Utils/list";
import { CreateRootPropertyAssignment, PropertyAssignment } from "./createPropertyAssignment";
import { CreateEventAssignment, EventAssignment } from "./createEventAssignment";
import { Assignment, CreateAssignment } from "./createAssignment";
import { AttributeAssignment, CreateAttributeAssignment } from "./createAttributeAssignment";

let pendingUpdates = List.Create<{ (): void }>();
let updateScheduled = false;

const frameTime = 16;
let frameStart = 0;
function processUpdates() {
  List.Add(pendingUpdates, null);

  let callback: { (): void };
  while ((callback = List.Pop(pendingUpdates))) callback();

  if (pendingUpdates.size === 0) updateScheduled = false;
  else {
    frameStart = Date.now();
    wndw.requestAnimationFrame(processUpdates);
  }
}

let highPriority = false;
function scheduleUpdate(callback: () => void) {
  if (highPriority) List.Push(pendingUpdates, callback);
  else List.Add(pendingUpdates, callback);

  if (!updateScheduled) {
    const now = Date.now();
    updateScheduled = true;
    if (now - frameStart < frameTime) queueMicrotask(processUpdates);
    else {
      frameStart = now;
      wndw.requestAnimationFrame(processUpdates);
    }
  }
}

function wrapPriorityUpdates<P extends any[]>(callback: (...args: P) => void) {
  return function (...args: P) {
    const currentPriority = highPriority;
    highPriority = true;
    callback(...args);
    highPriority = currentPriority;
  };
}

function getHTMLNode(from: HTMLElement | string, current?: HTMLElement | null) {
  if (typeof from === "string") {
    if (current?.nodeType === Node.TEXT_NODE) {
      DOMNodeConfig.setText(current, from);
      return current;
    }

    return DOMNodeConfig.createTextNode(from);
  }

  return from;
}

export const DOMNodeConfig: INodeConfig = {
  createNode(type: string, namespace?: string): Node {
    if (type === "text") return wndw.document.createTextNode("");

    return namespace
      ? wndw.document.createElementNS(namespace, type)
      : wndw.document.createElement(type);
  },
  createTextNode(value: string = "") {
    return wndw.document.createTextNode(value);
  },
  isTextNode(target: Node) {
    return target?.nodeType === Node.TEXT_NODE;
  },
  scheduleUpdate,
  wrapPriorityUpdates,
  addListener(target: Node, type: string, callback: { (): void }) {
    target.addEventListener(type, callback);
  },
  removeListener(target: Node, type: string, callback: { (): void }) {
    target.removeEventListener(type, callback);
  },
  addChild(root: Node, child: Node) {
    root.appendChild(child);
  },
  addChildFirst(root: Node, child: Node) {
    DOMNodeConfig.addChildBefore(root, root.firstChild, child);
  },
  addChildBefore(root: Node, sibling: Node, child: Node) {
    if (!sibling) {
      DOMNodeConfig.addChild(root, child);
      return;
    }

    if (child !== sibling) root.insertBefore(child, sibling);
  },
  addChildAfter(root: Node, sibling: Node, child: Node) {
    if (!sibling) {
      DOMNodeConfig.addChildFirst(root, child);
      return;
    }

    DOMNodeConfig.addChildBefore(root, sibling.nextSibling, child);
  },
  removeChild(root: Node, child: Node) {
    root.removeChild(child);
  },
  remove(target: Node) {
    target && target.parentNode && target.parentNode.removeChild(target);
  },
  setText(target: Node, text: string) {
    target.nodeValue = text;
  },
  copyText(source: Node, target: Node) {
    target.nodeValue = source.nodeValue;
  },
  getAttribute(target: HTMLElement, attribute: string) {
    return target.getAttribute(attribute);
  },
  setAttribute(target: HTMLElement, attribute: string, value: string) {
    target.setAttribute(attribute, value);
  },
  propertyAssignment(target: HTMLElement, next: any) {
    Assignment(target, next, PropertyAssignment);
  },
  createPropertyAssignment(target: HTMLElement) {
    return CreateAssignment(target, CreateRootPropertyAssignment);
  },
  eventAssignment(target: HTMLElement, next: any) {
    Assignment(target, next, EventAssignment);
  },
  createEventAssignment(target: HTMLElement) {
    return CreateAssignment(target, CreateEventAssignment);
  },
  attributeAssignment(target: HTMLElement, next: any) {
    Assignment(target, next, AttributeAssignment);
  },
  createAttributeAssignment(target: HTMLElement) {
    return CreateAssignment(target, CreateAttributeAssignment);
  },
  fireEvent(target: HTMLElement, event: string, data: any) {
    var cEvent = new CustomEvent(event, data);
    target.dispatchEvent(cEvent);
  },
  getFirstChild(target: HTMLElement) {
    return target.firstChild;
  },
  getLastChild(target: HTMLElement) {
    return target.lastChild;
  },
  getNextSibling(target: HTMLElement) {
    return target.nextSibling;
  },
  replaceChildren(target: HTMLElement, children: HTMLElement[]) {
    target.replaceChildren(...children);
  },
  reconcileChildren(target: HTMLElement, children: (HTMLElement | string)[]) {
    if (!target.hasChildNodes()) {
      for (let x = 0; x < children.length; x++) {
        const nextChild = getHTMLNode(children[x], null);

        target.appendChild(nextChild);
      }

      return;
    }

    let lastChild: HTMLElement = null;
    switch (children.length) {
      case 0:
        target.replaceChildren();
        break;
      case 1:
        lastChild = getHTMLNode(children[0], target.firstChild as HTMLElement);
        if (target.firstChild !== lastChild)
          target.insertBefore(lastChild, target.firstChild);
        break;
      default: {
        let currentChild = target.firstChild as HTMLElement;
        let inNextChildren = false;
        for (let x = 0; x < children.length; x++) {
          const nextChild = (lastChild = getHTMLNode(
            children[x],
            currentChild,
          ));

          if (!currentChild) target.appendChild(nextChild);
          else if (nextChild !== currentChild) {
            while(currentChild && (!(inNextChildren = inNextChildren || children.indexOf(currentChild, x + 1) >= 0))) {
              const toRemove = currentChild;
              currentChild = currentChild.nextSibling as HTMLElement;
              target.removeChild(toRemove);
            }

            nextChild !== currentChild &&
              target.insertBefore(nextChild, currentChild);
          } else inNextChildren = false;

          currentChild = nextChild.nextSibling as HTMLElement;
        }
        break;
      }
    }

    while (target.lastChild !== lastChild) target.removeChild(target.lastChild);
  }
};
