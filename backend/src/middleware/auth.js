"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const firebaseAdmin_1 = require("../firebaseAdmin");
const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized. Missing Bearer Token.' });
    }
    const token = authHeader.replace('Bearer ', '');
    try {
        const decodedToken = await firebaseAdmin_1.auth.verifyIdToken(token);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        console.error('Error verifying auth token:', error);
        return res.status(401).json({ error: 'Unauthorized. Invalid Token.' });
    }
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.js.map