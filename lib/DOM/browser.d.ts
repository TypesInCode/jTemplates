declare var config: {
    window: Window;
    immediateAnimationFrames: boolean;
    requestAnimationFrame: (callback: FrameRequestCallback) => {};
    createDocumentFragment: (node?: string | Node) => DocumentFragment;
};
export default config;
