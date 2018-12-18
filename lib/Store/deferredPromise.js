"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DeferredPromise {
    constructor(executor) {
        this.promise = new Promise(r => {
            this.resolve = r;
        });
        this.executor = executor;
    }
    Invoke() {
        this.resolve(new Promise(this.executor));
    }
    then(onfulfilled, onrejected) {
        return this.promise.then(onfulfilled, onrejected);
    }
    catch(onrejected) {
        return this.promise.catch(onrejected);
    }
}
exports.DeferredPromise = DeferredPromise;
//# sourceMappingURL=deferredPromise.js.map