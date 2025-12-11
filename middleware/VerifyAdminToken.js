import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";

// ⭐ Verify Admin Token (sederhana tanpa pengecekan email verification)
export const verifyAdminToken = async (req, res, next) => {
    try {
        const token = req.headers['authorization'];
        
        if (!token) {
            return res.status(401).json({ msg: "Akses ditolak, token admin tidak tersedia!" });
        }

        // Extract token dari "Bearer TOKEN"
        const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;

        // Verify token
        const decoded = jwt.verify(actualToken, process.env.ADMIN_ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET);
        
        // Cek apakah admin masih ada dan aktif
        const admin = await Admin.findByPk(decoded.adminId);
        
        if (!admin) {
            return res.status(401).json({ msg: "Admin tidak ditemukan" });
        }

        if (admin.status !== 'active') {
            return res.status(403).json({ msg: "Akun admin tidak aktif" });
        }

        // Set admin info ke request
        req.adminId = decoded.adminId;
        req.adminName = decoded.name;
        req.adminEmail = decoded.email;
        req.adminRole = decoded.role;
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                msg: "Token admin sudah expired",
                expired: true 
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ msg: "Token admin tidak valid" });
        }

        console.error('Admin token verification error:', error);
        res.status(500).json({ msg: "Server error" });
    }
};

// ⭐ Middleware untuk cek role admin
export const requireAdminRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.adminRole) {
            return res.status(401).json({ msg: "Admin authentication required" });
        }

        if (!allowedRoles.includes(req.adminRole)) {
            return res.status(403).json({ 
                msg: `Akses ditolak. Role yang dibutuhkan: ${allowedRoles.join(', ')}` 
            });
        }

        next();
    };
};

// ⭐ Middleware khusus untuk super admin
export const requireSuperAdmin = (req, res, next) => {
    if (!req.adminRole || req.adminRole !== 'super_admin') {
        return res.status(403).json({ 
            msg: "Akses ditolak. Hanya super admin yang diizinkan." 
        });
    }
    next();
};