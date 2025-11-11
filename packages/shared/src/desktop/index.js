"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDesktopApp = exports.getDesktopApi = void 0;
const resolveDesktopApi = () => {
    if (typeof window === "undefined") {
        return undefined;
    }
    return window.desktop;
};
const getDesktopApi = () => resolveDesktopApi();
exports.getDesktopApi = getDesktopApi;
const isDesktopApp = () => Boolean(resolveDesktopApi());
exports.isDesktopApp = isDesktopApp;
//# sourceMappingURL=index.js.map