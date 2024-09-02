
function jsdomWindow() {
    try {
        return require("jsdom").JSDOM("").window;
    }
    catch(err) {
        return undefined;
    }
}


export const wndw: Window = typeof window !== "undefined" ? window : jsdomWindow();