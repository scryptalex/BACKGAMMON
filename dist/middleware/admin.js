"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuth = void 0;
const adminAuth = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (!req.user.isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
};
exports.adminAuth = adminAuth;
//# sourceMappingURL=admin.js.map