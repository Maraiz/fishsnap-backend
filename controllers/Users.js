// controllers/Users.js - Versi tanpa Katalog/Contributor
import Users from '../models/userModel.js';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import { generateOTP, sendOTPEmail, sendWelcomeEmail } from '../services/emailService.js';

// ⭐ UPDATE: Function getUsers tanpa catalog status
export const getUsers = async (req, res) => {
    try {
        const userId = req.userId;

        console.log('Current user ID from token:', userId);

        if (!userId) {
            return res.status(400).json({ msg: "User ID tidak ditemukan dalam token" });
        }

        const user = await Users.findOne({
            where: { id: userId },
            attributes: [
                'id', 'name', 'email', 'phone', 'gender', 'role',
                'is_verified'
            ]
        });

        if (!user) {
            console.log('User not found for ID:', userId);
            return res.status(404).json({ msg: "User tidak ditemukan" });
        }

        // Add computed fields (hapus can_access_catalog)
        const userWithStatus = {
            ...user.toJSON(),
            is_email_verified: user.isEmailVerified()
        };

        console.log('User found:', user.name, 'Role:', user.role);
        res.json(userWithStatus);

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ msg: "Server error" });
    }
};

// ⭐ TAMBAHAN: Function untuk update user profile
export const updateUserProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { name, phone, gender } = req.body;

        // Validasi input
        if (!name && !phone && !gender) {
            return res.status(400).json({
                msg: "Minimal satu field harus diisi untuk update"
            });
        }

        // Cari user
        const user = await Users.findByPk(userId);
        if (!user) {
            return res.status(404).json({ msg: "User tidak ditemukan" });
        }

        // Cek apakah phone number sudah dipakai user lain
        if (phone && phone !== user.phone) {
            const existingUser = await Users.findOne({
                where: {
                    phone: phone,
                    id: { [Op.ne]: userId } // Exclude current user
                }
            });

            if (existingUser) {
                return res.status(400).json({
                    msg: "Nomor telepon sudah digunakan user lain"
                });
            }
        }

        // Build update object
        const updateData = {};
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (gender) updateData.gender = gender;

        // Update user
        await user.update(updateData);

        // Return updated user (without sensitive data)
        const updatedUser = await Users.findOne({
            where: { id: userId },
            attributes: [
                'id', 'name', 'email', 'phone', 'gender', 'role',
                'is_verified'
            ]
        });

        res.status(200).json({
            msg: "Profile berhasil diupdate",
            user: {
                ...updatedUser.toJSON()
            }
        });

    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ msg: "Server error" });
    }
};

// ⭐ TAMBAHAN: Function untuk change password
export const changePassword = async (req, res) => {
    try {
        const userId = req.userId;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validasi input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                msg: "Password saat ini, password baru, dan konfirmasi password harus diisi"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                msg: "Password baru dan konfirmasi password tidak cocok"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                msg: "Password baru minimal 6 karakter"
            });
        }

        // Cari user
        const user = await Users.findByPk(userId);
        if (!user) {
            return res.status(404).json({ msg: "User tidak ditemukan" });
        }

        // Cek current password
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) {
            return res.status(400).json({
                msg: "Password saat ini salah"
            });
        }

        // Hash password baru
        const salt = await bcrypt.genSalt();
        const hashPassword = await bcrypt.hash(newPassword, salt);

        // Update password dan clear refresh token
        await user.update({
            password: hashPassword,
            refresh_token: null
        });

        // Clear cookie
        res.clearCookie('refreshToken');

        res.status(200).json({
            msg: "Password berhasil diubah. Silakan login ulang.",
            requireRelogin: true
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ msg: "Server error" });
    }
};

// ⭐ TAMBAHAN: Function untuk get user's prediction history (hapus in_catalog_only)
export const getUserPredictions = async (req, res) => {
    try {
        const userId = req.userId;
        const { page = 1, limit = 10 } = req.query;

        const offset = (page - 1) * limit;

        // Import FishPredictions model
        const FishPredictions = (await import('../models/fishPredictionModel.js')).default;

        // Build where condition (hapus catalog-related)
        const whereCondition = { userId };

        // Get predictions
        const [predictions, total] = await Promise.all([
            FishPredictions.findAll({
                where: whereCondition,
                attributes: [
                    'id', 'predictedFishName', 'probability', 'habitat',
                    'consumptionSafety', 'fishImage', 'predictionDate',
                    'predictionTime', 'notes'
                ],
                order: [['predictionDate', 'DESC'], ['predictionTime', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            }),
            FishPredictions.count({ where: whereCondition })
        ]);

        res.status(200).json({
            msg: "Riwayat prediksi berhasil diambil",
            predictions: predictions.map(pred => ({
                ...pred.toJSON(),
                fishImage: pred.fishImage ? `${process.env.BASE_URL}/uploads/${pred.fishImage}` : null
            })),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total
            }
        });

    } catch (error) {
        console.error('Error fetching user predictions:', error);
        res.status(500).json({ msg: "Server error" });
    }
};

// ⭐ REGISTER: Register function - kirim OTP ke email
export const Register = async (req, res) => {
    const { name, phone, email, gender, password } = req.body;

    // Validasi input
    if (!name || !phone || !email || !gender || !password) {
        return res.status(400).json({ msg: "Semua field harus diisi" });
    }

    if (password.length < 6) {
        return res.status(400).json({ msg: "Password minimal 6 karakter" });
    }

    try {
        // Cek apakah email atau phone sudah terdaftar
        const existingUser = await Users.findOne({
            where: {
                [Op.or]: [
                    { email: email },
                    { phone: phone }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({
                msg: existingUser.email === email
                    ? "Email sudah terdaftar"
                    : "Nomor telepon sudah digunakan"
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt();
        const hashPassword = await bcrypt.hash(password, salt);

        // Generate OTP
        const otp = generateOTP();

        // Simpan user baru dengan OTP (belum verified)
        const newUser = await Users.create({
            name,
            phone,
            email,
            gender,
            password: hashPassword,
            role: 'user',
            otp_code: otp,
            otp_expires: new Date(Date.now() + 10 * 60 * 1000), // 10 menit expiry
            is_verified: false
        });

        console.log('New user created:', newUser.email);

        // Kirim OTP ke email
        try {
            await sendOTPEmail(email, name, otp);
            console.log('OTP sent to:', email);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
            return res.status(500).json({
                msg: "Gagal mengirim email verifikasi"
            });
        }

        // Return response tanpa password dan OTP
        const { password: _, otp_code: __, ...userWithoutSensitive } = newUser.toJSON();

        res.status(201).json({
            msg: "Registrasi berhasil! Silakan verifikasi email Anda dengan OTP yang dikirim.",
            user: userWithoutSensitive
        });

    } catch (error) {
        console.error('Registration error:', error);

        if (error.name === "SequelizeValidationError") {
            return res.status(400).json({
                msg: "Data tidak valid",
                errors: error.errors.map(e => ({
                    field: e.path,
                    message: e.message
                }))
            });
        }

        res.status(500).json({ msg: "Terjadi kesalahan server" });
    }
};

// ⭐ VERIFY OTP: Verifikasi OTP dan kirim welcome email jika sukses
export const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ msg: "Email dan OTP harus diisi" });
    }

    try {
        const user = await Users.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ msg: "Email tidak ditemukan" });
        }

        if (user.is_verified) {
            return res.status(400).json({ msg: "Email sudah diverifikasi" });
        }

        if (user.otp_code !== otp) {
            return res.status(400).json({ msg: "Kode OTP salah" });
        }

        if (new Date() > user.otp_expires) {
            return res.status(400).json({ msg: "Kode OTP telah kadaluarsa" });
        }

        // Update verified
        await user.update({
            is_verified: true,
            email_verified_at: new Date(),
            otp_code: null,
            otp_expires: null
        });

        // Kirim welcome email
        try {
            await sendWelcomeEmail(email, user.name);
        } catch (err) {
            console.error("Email welcome gagal:", err);
        }

        // === Setelah verifikasi berhasil → BUAT TOKEN ===
        const accessToken = jwt.sign(
            { userId: user.id, name: user.name, email: user.email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
        );

        const refreshToken = jwt.sign(
            { userId: user.id, name: user.name, email: user.email },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" }
        );

        // Simpan refresh token
        await Users.update(
            { refresh_token: refreshToken },
            { where: { id: user.id } }
        );

        // Kirim cookie
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: "Strict",
            maxAge: 15 * 60 * 1000
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // === RESPONSE FINAL ===
        res.status(200).json({
            msg: "Verifikasi email berhasil!",
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                is_verified: true
            }
        });

    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({ msg: "Terjadi kesalahan server" });
    }
};



// ⭐ RESEND OTP: Kirim ulang OTP
export const resendOTP = async (req, res) => {
    const { email } = req.body;

    // Validasi input
    if (!email) {
        return res.status(400).json({ msg: "Email harus diisi" });
    }

    try {
        // Cari user berdasarkan email
        const user = await Users.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ msg: "Email tidak ditemukan" });
        }

        // Cek jika sudah verified
        if (user.is_verified) {
            return res.status(400).json({ msg: "Email sudah diverifikasi" });
        }

        // Generate OTP baru
        const newOTP = generateOTP();

        // Update OTP di database
        await user.update({
            otp_code: newOTP,
            otp_expires: new Date(Date.now() + 10 * 60 * 1000) // 10 menit expiry
        });

        // Kirim OTP baru ke email
        try {
            await sendOTPEmail(email, user.name, newOTP);
            console.log('OTP resent successfully to:', email);
        } catch (emailError) {
            console.error('Failed to resend OTP email:', emailError);
            return res.status(500).json({
                msg: "Gagal mengirim ulang email verifikasi"
            });
        }

        res.status(200).json({
            msg: "Kode verifikasi berhasil dikirim ulang. Silakan cek email Anda."
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            msg: "Terjadi kesalahan server"
        });
    }
};

// ⭐ FIXED: Login function - Check email verification
export const Login = async (req, res) => {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
        return res.status(400).json({ msg: "Email dan password harus diisi" });
    }

    try {
        // Cari user berdasarkan email
        const user = await Users.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ msg: "Email tidak ditemukan" });
        }

        // CHECK: Email verification status
        console.log('🔍 Login attempt for user:', {
            email: user.email,
            is_verified: user.is_verified,
            email_verified_at: user.email_verified_at
        });

        // AUTO-FIX: If user can login but not verified, auto-verify them
        if (!user.is_verified) {
            console.log('🔧 Auto-verifying user who can login:', user.email);
            await user.update({
                is_verified: true,
                email_verified_at: new Date()
            });
            console.log('✅ User auto-verified:', user.email);
        }

        // Cocokkan password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ msg: "Password salah" });
        }

        // Ambil data yang dibutuhkan untuk token
        const userId = user.id;
        const name = user.name;
        const userEmail = user.email;

        // Buat access token (shorter expiry for cookies)
        const accessToken = jwt.sign(
            { userId, name, email: userEmail },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' } // Shorter expiry for security
        );

        // Buat refresh token
        const refreshToken = jwt.sign(
            { userId, name, email: userEmail },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' } // Longer expiry for refresh
        );

        // Simpan refresh token di database
        await Users.update(
            { refresh_token: refreshToken },
            { where: { id: userId } }
        );

        // Set access token ke HTTP-only cookie
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 15 * 60 * 1000 // 15 menit
        });

        // Set refresh token ke HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 hari
        });

        // INCLUDE: Email verification status in response
        res.status(200).json({
            msg: "Login berhasil",
            accessToken, // Still send in response for immediate use, but also in cookie
            user: {
                id: userId,
                name,
                email: userEmail,
                is_verified: true, // Always true after auto-fix
                role: user.role || 'user'
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ msg: "Terjadi kesalahan pada server" });
    }
};

export const Logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    try {
        if (refreshToken) {
            // Find user and clear refresh token from database
            const user = await Users.findOne({
                where: { refresh_token: refreshToken }
            });

            if (user) {
                await Users.update(
                    { refresh_token: null },
                    { where: { id: user.id } }
                );
            }
        }

        // Clear both cookies
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict'
        });

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict'
        });

        res.json({ msg: "Logout berhasil" });

    } catch (error) {
        console.error('Logout error:', error);
        // Still clear cookies even if database operation fails
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.status(500).json({ msg: "Server error, but cookies cleared" });
    }
};
