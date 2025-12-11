// controllers/Admin.js - Versi tanpa Katalog/Contributor
import Admin from '../models/adminModel.js';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';

// ⭐ GET ADMIN PROFILE (yang sedang login)
export const getAdmin = async (req, res) => {
    try {
        // Ambil adminId dari token
        const adminId = req.adminId;

        console.log('Current admin ID from token:', adminId); // Debug log

        if (!adminId) {
            return res.status(400).json({ msg: "Admin ID tidak ditemukan dalam token" });
        }

        // Return data admin yang sedang login saja
        const admin = await Admin.findOne({
            where: { id: adminId },
            attributes: [
                'id', 'name', 'email', 'phone', 'gender', 'role', 'status', 'last_login'
            ]
        });

        if (!admin) {
            console.log('Admin not found for ID:', adminId);
            return res.status(404).json({ msg: "Admin tidak ditemukan" });
        }

        console.log('Admin found:', admin.name, 'Role:', admin.role, 'Status:', admin.status);
        res.json(admin); // Return single object

    } catch (error) {
        console.error('Error fetching admin:', error);
        res.status(500).json({ msg: "Server error" });
    }
};

// ⭐ CREATE ADMIN MANUAL (via API/Postman - tidak ada OTP)
export const createAdmin = async (req, res) => {
    const {
        name,
        phone,
        email,
        gender,
        password,
        role = 'admin' // Default role, ubah ke 'admin' karena catalog_moderator dihapus
    } = req.body;

    // Validasi input dasar
    if (!name || !phone || !email || !gender || !password) {
        return res.status(400).json({
            msg: "Nama, no telp, email, jenis kelamin, dan password wajib diisi"
        });
    }

    // Validasi role (hapus 'catalog_moderator')
    const allowedRoles = ['super_admin', 'admin'];
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({
            msg: "Role tidak valid. Role yang diizinkan: " + allowedRoles.join(', ')
        });
    }

    try {
        // Cek apakah email atau no telp sudah terdaftar
        const existingAdmin = await Admin.findOne({
            where: {
                [Op.or]: [
                    { email: email },
                    { phone: phone }
                ]
            }
        });

        if (existingAdmin) {
            return res.status(400).json({
                msg: existingAdmin.email === email
                    ? "Email sudah terdaftar"
                    : "No Telp sudah digunakan"
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt();
        const hashPassword = await bcrypt.hash(password, salt);

        console.log('Creating admin:', email); // Debug log

        // Simpan ke database (langsung aktif, tidak perlu verifikasi)
        const newAdmin = await Admin.create({
            name,
            phone,
            email,
            gender,
            password: hashPassword,
            role,
            status: 'active', // Langsung aktif
            created_by: req.adminId || null // Track siapa yang buat admin ini jika ada
        });

        console.log('Admin created successfully:', newAdmin.email);

        // Buang password dari response
        const { password: _, ...adminWithoutPassword } = newAdmin.toJSON();

        res.status(201).json({
            msg: "Admin berhasil dibuat dan siap untuk login",
            admin: adminWithoutPassword
        });

    } catch (error) {
        console.error("Admin creation error:", error);

        if (error.name === "SequelizeValidationError") {
            return res.status(400).json({
                msg: "Data tidak valid",
                errors: error.errors.map(e => ({
                    field: e.path,
                    message: e.message
                }))
            });
        }

        res.status(500).json({
            msg: "Terjadi kesalahan server"
        });
    }
};

// ⭐ TAMBAHAN: Function baru untuk admin dashboard stats (disesuaikan tanpa katalog)
export const getAdminDashboardStats = async (req, res) => {
    try {
        const adminId = req.adminId;
        
        // Cek admin permission
        const admin = await Admin.findByPk(adminId);
        if (!admin) {
            return res.status(404).json({ msg: "Admin tidak ditemukan" });
        }

        // Import Users model untuk stats
        const Users = (await import('../models/userModel.js')).default;
        const FishPredictions = (await import('../models/fishPredictionModel.js')).default;

        // Get statistics (hapus contributor dan catalog-related)
        const stats = await Promise.all([
            // Total users
            Users.count(),
            
            // Users by role (hanya user dan admin)
            Users.count({ where: { role: 'user' } }),
            Users.count({ where: { role: 'admin' } }),
            
            // Total predictions
            FishPredictions.count()
        ]);

        const [
            totalUsers,
            regularUsers, 
            adminUsers,
            totalPredictions
        ] = stats;

        res.status(200).json({
            msg: "Dashboard stats berhasil diambil",
            data: {
                users: {
                    total: totalUsers,
                    regular: regularUsers,
                    admins: adminUsers
                },
                predictions: {
                    total: totalPredictions
                },
                admin_info: {
                    name: admin.name,
                    role: admin.role,
                    permissions: admin.permissions || Admin.getDefaultPermissions(admin.role)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching admin dashboard stats:', error);
        res.status(500).json({ msg: "Server error" });
    }
};

// ⭐ ADMIN LOGIN (tetap, tanpa perubahan besar)
export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validasi input
        if (!email || !password) {
            return res.status(400).json({ msg: "Email dan password harus diisi" });
        }

        // Cari admin berdasarkan email
        const admin = await Admin.findOne({ where: { email } });
        if (!admin) {
            return res.status(404).json({ msg: "Email tidak ditemukan" });
        }

        // Cocokkan password
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(400).json({ msg: "Password salah" });
        }

        // Cek status admin
        if (admin.status !== 'active') {
            return res.status(403).json({ 
                msg: `Akun admin ${admin.status}. Hubungi super admin.`
            });
        }

        // Buat access token (shorter expiry for cookies)
        const accessToken = jwt.sign(
            { adminId: admin.id, name: admin.name, email: admin.email },
            process.env.ADMIN_ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        // Buat refresh token
        const refreshToken = jwt.sign(
            { adminId: admin.id, name: admin.name, email: admin.email },
            process.env.ADMIN_REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        // Update refresh token dan last login di database
        await Admin.update(
            { 
                refresh_token: refreshToken,
                last_login: new Date()
            },
            { where: { id: admin.id } }
        );

        // Set access token ke HTTP-only cookie
        res.cookie('adminAccessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 15 * 60 * 1000 // 15 menit
        });

        // Set refresh token ke HTTP-only cookie
        res.cookie('adminRefreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 hari
        });

        res.status(200).json({
            msg: "Login admin berhasil",
            accessToken,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ msg: "Terjadi kesalahan pada server" });
    }
};

// ⭐ ADMIN LOGOUT (tetap)
export const logoutAdmin = async (req, res) => {
    const refreshToken = req.cookies.adminRefreshToken;

    try {
        if (refreshToken) {
            // Find admin and clear refresh token from database
            const admin = await Admin.findOne({
                where: { refresh_token: refreshToken }
            });

            if (admin) {
                await Admin.update(
                    { refresh_token: null },
                    { where: { id: admin.id } }
                );
            }
        }

        // Clear both cookies
        res.clearCookie('adminAccessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict'
        });

        res.clearCookie('adminRefreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict'
        });

        res.json({ msg: "Logout admin berhasil" });

    } catch (error) {
        console.error('Admin logout error:', error);
        // Still clear cookies even if database operation fails
        res.clearCookie('adminAccessToken');
        res.clearCookie('adminRefreshToken');
        res.status(500).json({ msg: "Server error, but cookies cleared" });
    }
};

// ⭐ GET ALL ADMINS (hanya super_admin yang bisa akses)
export const getAllAdmins = async (req, res) => {
    try {
        // Cek role admin yang request
        const currentAdminId = req.adminId;
        const currentAdmin = await Admin.findByPk(currentAdminId);

        if (!currentAdmin || currentAdmin.role !== 'super_admin') {
            return res.status(403).json({
                msg: "Akses ditolak. Hanya super admin yang bisa melihat daftar admin."
            });
        }

        const admins = await Admin.findAll({
            attributes: [
                'id', 'name', 'email', 'phone', 'gender', 'role', 'status', 
                'last_login', 'createdAt'
            ],
            include: [
                {
                    model: Admin,
                    as: 'creator',
                    attributes: ['id', 'name'],
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            msg: "Daftar admin berhasil diambil",
            data: admins,
            total: admins.length
        });

    } catch (error) {
        console.error('Error fetching all admins:', error);
        res.status(500).json({ msg: "Server error" });
    }
};

// ⭐ UPDATE ADMIN STATUS (hanya super_admin)
export const updateAdminStatus = async (req, res) => {
    try {
        const { adminId } = req.params;
        const { status } = req.body;
        const currentAdminId = req.adminId;

        // Cek role admin yang request
        const currentAdmin = await Admin.findByPk(currentAdminId);
        if (!currentAdmin || currentAdmin.role !== 'super_admin') {
            return res.status(403).json({
                msg: "Akses ditolak. Hanya super admin yang bisa mengubah status admin."
            });
        }

        // Validasi status
        const allowedStatuses = ['active', 'inactive', 'suspended'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                msg: "Status tidak valid. Status yang diizinkan: " + allowedStatuses.join(', ')
            });
        }

        // Cek admin target
        const targetAdmin = await Admin.findByPk(adminId);
        if (!targetAdmin) {
            return res.status(404).json({
                msg: "Admin tidak ditemukan"
            });
        }

        // Tidak bisa mengubah status diri sendiri
        if (parseInt(adminId) === currentAdminId) {
            return res.status(400).json({
                msg: "Tidak bisa mengubah status diri sendiri"
            });
        }

        // Update status
        await Admin.update(
            { status: status },
            { 
                where: { id: adminId },
                adminId: currentAdminId // Untuk tracking updated_by via hook
            }
        );

        res.json({
            msg: `Status admin ${targetAdmin.name} berhasil diubah menjadi ${status}`,
            data: {
                adminId: targetAdmin.id,
                name: targetAdmin.name,
                status: status
            }
        });

    } catch (error) {
        console.error('Error updating admin status:', error);
        res.status(500).json({ msg: "Server error" });
    }
};

// ⭐ UPDATE ADMIN PASSWORD (self atau super_admin)
export const updateAdminPassword = async (req, res) => {
    try {
        const { adminId } = req.params;
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const requestingAdminId = req.adminId;

        // Validasi input
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                msg: "Password baru dan konfirmasi password harus diisi"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                msg: "Password baru dan konfirmasi password tidak cocok"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                msg: "Password minimal 6 karakter"
            });
        }

        // Cek admin target
        const targetAdmin = await Admin.findByPk(adminId);
        if (!targetAdmin) {
            return res.status(404).json({
                msg: "Admin tidak ditemukan"
            });
        }

        // Cek admin yang request
        const requestingAdmin = await Admin.findByPk(requestingAdminId);

        // Jika bukan diri sendiri, harus super admin
        if (parseInt(adminId) !== requestingAdminId && requestingAdmin.role !== 'super_admin') {
            return res.status(403).json({
                msg: "Anda hanya bisa mengubah password sendiri atau harus super admin"
            });
        }

        // Jika mengubah password sendiri, harus masukkan current password
        if (parseInt(adminId) === requestingAdminId) {
            if (!currentPassword) {
                return res.status(400).json({
                    msg: "Password saat ini harus diisi"
                });
            }

            const match = await bcrypt.compare(currentPassword, targetAdmin.password);
            if (!match) {
                return res.status(400).json({
                    msg: "Password saat ini salah"
                });
            }
        }

        // Hash password baru
        const salt = await bcrypt.genSalt();
        const hashPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await Admin.update(
            { 
                password: hashPassword,
                refresh_token: null // Clear refresh token untuk force re-login
            },
            { 
                where: { id: adminId },
                adminId: requestingAdminId // Untuk tracking updated_by
            }
        );

        res.json({
            msg: "Password admin berhasil diubah. Silakan login ulang.",
            data: {
                adminId: targetAdmin.id,
                name: targetAdmin.name
            }
        });

    } catch (error) {
        console.error('Error updating admin password:', error);
        res.status(500).json({ msg: "Server error" });
    }
};