"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppMode = exports.Platform = void 0;
var Platform;
(function (Platform) {
    Platform["XACTIMATE"] = "Xactimate";
    Platform["SYMBILITY_COTALITY"] = "Symbility / Cotality";
    Platform["HAND_WRITTEN"] = "Hand Written";
})(Platform || (exports.Platform = Platform = {}));
var AppMode;
(function (AppMode) {
    AppMode["DASHBOARD"] = "Dashboard";
    AppMode["INVESTIGATION"] = "Investigation";
    AppMode["COMPARISON"] = "Comparison";
    AppMode["REVERSE_ENGINEER"] = "Reverse Engineer";
    AppMode["COMPLIANCE_AUDIT"] = "Compliance Audit";
    AppMode["SETTINGS"] = "Settings";
    AppMode["REPORTS"] = "Reports";
    AppMode["LIBRARY"] = "Library";
})(AppMode || (exports.AppMode = AppMode = {}));
//# sourceMappingURL=types.js.map