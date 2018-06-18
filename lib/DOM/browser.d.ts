declare function CreateDocumentFragment(node?: Node | string): DocumentFragment;
declare var config: {
    window: Window;
    immediateAnimationFrames: boolean;
    requestAnimationFrame: (callback: FrameRequestCallback) => {};
    createDocumentFragment: typeof CreateDocumentFragment;
};
export default config;
