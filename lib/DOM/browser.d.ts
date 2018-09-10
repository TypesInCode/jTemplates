declare function CreateDocumentFragment(node?: Node | string): DocumentFragment;
export declare var browser: {
    window: Window;
    immediateAnimationFrames: boolean;
    requestAnimationFrame: (callback: FrameRequestCallback) => {};
    createDocumentFragment: typeof CreateDocumentFragment;
};
export {};
