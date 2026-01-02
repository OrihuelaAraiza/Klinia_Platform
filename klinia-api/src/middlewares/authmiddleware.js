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

        const user = await prisma.user.findUnique({
            where: { id: decoded.sub },
            select: {
                id: true,
                email: true,
                role: true,
                delegatedById: true,
            },
        });

        if (!user) {
            return res.status(401).json({ message: "Usuario no encontrado." });
        }

        req.user = user;
        return next();

    } catch (error) {
        console.warn(`[Auth] Error de token: ${error.message}`);
        return res.status(401).json({ message: "Token inválido o expirado." });
    }
}