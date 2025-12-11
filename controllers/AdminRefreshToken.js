import Admin from '../models/adminModel.js';
import jwt from 'jsonwebtoken';

export const refreshAdminToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.adminRefreshToken;
        
        if (!refreshToken) {
            return res.status(401).json({ 
                msg: "Refresh token admin tidak ditemukan",
                needLogin: true 
            });
        }
        
        // Cari admin dengan refresh token
        const admin = await Admin.findOne({
            where: {
                refresh_token: refreshToken
            }
        });

        if (!admin) {
            return res.status(403).json({ 
                msg: "Refresh token admin tidak valid",
                needLogin: true 
            });
        }

        // Cek status admin
        if (admin.status !== 'active') {
            return res.status(403).json({ 
                msg: "Akun admin tidak aktif",
                needLogin: true 
            });
        }

        // Verify refresh token
        jwt.verify(refreshToken, process.env.ADMIN_REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({ 
                    msg: "Refresh token admin expired",
                    needLogin: true 
                });
            }

            // Generate access token baru
            const adminId = admin.id;
            const name = admin.name;
            const email = admin.email;
            const role = admin.role;

            const accessToken = jwt.sign(
                { adminId, name, email, role },
                process.env.ADMIN_ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '8h' } // Admin token 8 jam
            );

            res.json({ 
                accessToken,
                admin: {
                    id: adminId,
                    name,
                    email,
                    role
                }
            });
        });
    } catch (error) {
        console.error('Admin refresh token error:', error);
        res.status(500).json({ 
            msg: "Server error",
            needLogin: true 
        });
    }
};