// middleware/OptionalVerifyToken.js
import jwt from "jsonwebtoken";

export const optionalVerifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('Optional auth - header present:', !!authHeader);
    console.log('Optional auth - token extracted:', !!token);
    
    // If no token, just continue without setting user info
    if (!token) {
        console.log('No token provided, continuing without authentication');
        return next();
    }
    
    // If token exists, try to verify it
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log('Token verification failed, continuing without authentication:', err.message);
            // Don't fail the request, just continue without user info
            return next();
        }
        
        // If token is valid, set user info
        req.userId = decoded.userId;
        req.email = decoded.email;
        req.name = decoded.name;
        
        console.log('Optional auth successful for user:', decoded.userId);
        next();
    });
};