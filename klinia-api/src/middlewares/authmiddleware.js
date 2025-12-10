// klinia-api/src/middlewares/authMiddleware.js

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js'; 
import { prisma } from '../services/dbClient.js';


function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7); 
    }
    return null;
}


export async function authenticateToken(req, res, next) {
    const token = extractToken(req);

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);

        req.user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
        };
        return next();

    } catch (error) {
        console.warn(`[Auth] Error de token: ${error.message}`);
        return res.status(401).json({ message: "Token inválido o expirado." });
    }
}