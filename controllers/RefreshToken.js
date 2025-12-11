import Users from '../models/userModel.js';
import jwt from 'jsonwebtoken';

export const refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return res.sendStatus(401);
        
        // Gunakan findOne() untuk mencari user
        const user = await Users.findOne({
            where: {
                refresh_token: refreshToken
            }
        });

        // Cek apakah user ditemukan
        if (!user) return res.sendStatus(403);

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err) return res.sendStatus(403);

            // Langsung akses properti user
            const userId = user.id;
            const name = user.name;
            const email = user.email;

            const accessToken = jwt.sign(
                { userId, name, email },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '15m' } // Consistent with login (15 minutes)
            );

            // Set new access token as HTTP-only cookie
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            // Also return in response for immediate use
            res.json({ 
                accessToken,
                user: {
                    id: userId,
                    name,
                    email,
                    role: user.role || 'user'
                }
            });
        });
    } catch (error) {
        console.error('Kesalahan refresh token:', error);
        res.status(500).json({ msg: "Kesalahan server" });
    }
};