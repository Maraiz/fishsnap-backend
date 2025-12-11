
// routes/index.js - COMPLETE FIXED VERSION

// routes/index.js - Updated tanpa Catalog Management Routes

import express from 'express';
import path from 'path';
import {
  getUsers,
  Register,
  Login,
  Logout,
  verifyOTP,
  resendOTP,
} from '../controllers/Users.js';
import {
  predictTabular,
  predictImage,
  saveScan,
  saveToCatalog,
  getScans,
  getCatalog
} from '../controllers/Models.js';

// ✅ Import Histori Controller
import {
  getAllDataIkan,
  getDataIkanById,
  getMyDataIkan,
  saveToDataIkan,
  updateDataIkan,
  deleteDataIkan,
  getDataIkanStatistics
} from '../controllers/Histori.js';

import { verifyToken } from '../middleware/VerifyToken.js';
import { refreshToken } from '../controllers/RefreshToken.js';
import {
  getAdmin,
  createAdmin,
  loginAdmin,
  logoutAdmin,
  getAllAdmins,
  updateAdminStatus,
  updateAdminPassword
} from '../controllers/Admin.js';
import { verifyAdminToken, requireSuperAdmin } from '../middleware/VerifyAdminToken.js';
import { refreshAdminToken } from '../controllers/AdminRefreshToken.js';




// Import email controllers
import {
  sendCatalogReviewEmail,
  sendCatalogApprovedEmailController,
  sendCatalogRejectedEmailController,
  testEmailConnection,
  testEmailSending
} from '../controllers/EmailController.js';


import {
  getAllGalery,
  getGaleryById,
  createGalery,
  updateGalery,
  deleteGalery
} from '../controllers/Galery.js';

import {
  getAllRecipes,
  getRecipeById,
  getRecipesByFishName,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getUniqueFishNames
} from '../controllers/Recipe.js';

import multer from 'multer';
import Users from '../models/userModel.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';



const router = express.Router();

// ==================== MULTER CONFIGURATION ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|bmp|heic|tif|tiff|mpo|pfm|dng/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung! Hanya gambar (jpg, png, dll.) yang diizinkan.'));
    }
  }
});

// ==================== AUTH ROUTES (USER) ====================
// Public routes - No authentication needed
router.post('/users', Register);
router.post('/login', Login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Protected routes - Need authentication
router.get('/users', verifyToken, getUsers);
router.post('/token', refreshToken);
router.delete('/logout', Logout);

// Update Profile - Protected
// Endpoint untuk memperbarui data profil - FIXED VERSION
router.put('/users/update', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    console.log('📝 Update request from user:', userId);
    console.log('📋 Request body:', req.body);

    const { name, email, password, phone, gender, birthday } = req.body;
    const updateData = {};

    if (name !== undefined) {
      if (name.length < 2) {
        return res.status(400).json({ msg: 'Nama pengguna minimal 2 karakter' });
      }
      updateData.name = name;
    }

    if (email !== undefined) {
      if (!email.includes('@')) {
        return res.status(400).json({ msg: 'Format email tidak valid' });
      }
      const existingEmail = await Users.findOne({
        where: { email, id: { [Op.ne]: userId } }
      });
      if (existingEmail) {
        return res.status(400).json({ msg: 'Email sudah digunakan' });
      }
      updateData.email = email;
    }

    if (password !== undefined && password !== '***********') {
      if (password.length < 6) {
        return res.status(400).json({ msg: 'Password minimal 6 karakter' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (phone !== undefined) {
      if (phone.length < 8 || !/^\d+$/.test(phone)) {
        return res.status(400).json({ msg: 'Nomor HP tidak valid, minimal 8 digit dan hanya angka' });
      }
      const existingPhone = await Users.findOne({
        where: { phone, id: { [Op.ne]: userId } }
      });
      if (existingPhone) {
        return res.status(400).json({ msg: 'Nomor HP sudah digunakan' });
      }
      updateData.phone = phone;
    }

    if (gender !== undefined) {
      if (!['male', 'female'].includes(gender)) {
        return res.status(400).json({ msg: 'Jenis kelamin harus male atau female' });
      }
      updateData.gender = gender;
    }

    if (birthday !== undefined) {
      const date = new Date(birthday);
      if (isNaN(date) || date > new Date()) {
        return res.status(400).json({ msg: 'Tanggal lahir tidak valid' });
      }
      updateData.birthday = birthday;
    }

    console.log('🔧 Update data to be saved:', updateData);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        msg: 'Tidak ada data yang diperbarui',
        debug: 'Received fields: ' + Object.keys(req.body).join(', ')
      });
    }

    const [affectedRows] = await Users.update(updateData, { where: { id: userId } });

    if (affectedRows === 0) {
      return res.status(404).json({ msg: 'User tidak ditemukan' });
    }

    console.log('✅ Profile updated successfully for user:', userId);

    res.status(200).json({
      msg: 'Data profil berhasil diperbarui',
      updatedFields: Object.keys(updateData)
    });

  } catch (error) {
    console.error('❌ Kesalahan saat memperbarui profil:', error);
    res.status(500).json({
      msg: 'Kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== ML PREDICTION ROUTES ====================
router.post('/predict', predictTabular);
router.post('/predict-image', upload.single('image'), predictImage);

// ==================== SCAN & CATALOG ROUTES ====================
router.post('/api/save-scan', upload.single('image'), saveScan);
router.post('/api/save-to-catalog', verifyToken, upload.single('image'), saveToCatalog); // Catatan: Jika saveToCatalog tidak diperlukan, hapus ini juga
router.get('/api/get-scans', getScans);
router.get('/api/get-catalog', getCatalog); // Catatan: Jika getCatalog tidak diperlukan, hapus ini juga

// ==================== 🔒 DATA IKAN / HISTORI ROUTES (SECURED) ====================
// ✅ PROTECTED: User-specific data only
router.get('/api/data-ikan/my', verifyToken, getMyDataIkan);
router.get('/api/data-ikan/statistics', verifyToken, getDataIkanStatistics);

// ✅ PROTECTED: With ownership check
router.get('/api/data-ikan/:id', verifyToken, getDataIkanById);
router.put('/api/data-ikan/:id', verifyToken, upload.single('image'), updateDataIkan);
router.delete('/api/data-ikan/:id', verifyToken, deleteDataIkan);

// ✅ CRITICAL FIX: Add verifyToken middleware here!
router.post('/api/save-to-dataikan', verifyToken, upload.single('image'), saveToDataIkan);

// ✅ ADMIN ONLY: Get all data
router.get('/api/data-ikan/all', verifyToken, getAllDataIkan);

// Backward compatibility - redirect to authenticated version
router.get('/api/data-ikan', verifyToken, getMyDataIkan);


router.get('/api/catalog/approval-status', verifyToken, async (req, res) => {
  try {
    console.log('🔍 Checking approval status for user:', req.userId);
    const result = await getCatalogAccessStatus(req, res);
    if (!res.headersSent) {
      return result;
    }
  } catch (error) {
    console.error('❌ Error checking approval status:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        status: 'pending',
        msg: 'Error checking approval status',
        error: error.message
      });
    }
  }
});

// ==================== HTTP COOKIES MANAGEMENT ROUTES ====================
router.get('/api/catalog/status', verifyToken, async (req, res) => {
  try {
    console.log('📖 Getting catalog status from cookies for user:', req.userEmail || req.userId);

    const catalogRequestSubmitted = req.cookies.catalogRequestSubmitted === 'true';
    const adminApprovalStatus = req.cookies.adminApprovalStatus || 'pending';

    console.log('🍪 Cookie values:', {
      catalogRequestSubmitted,
      adminApprovalStatus
    });

    res.json({
      status: 'success',
      data: {
        catalogRequestSubmitted,
        adminApprovalStatus
      }
    });

  } catch (error) {
    console.error('❌ Error getting catalog status from cookies:', error);
    res.status(500).json({
      status: 'error',
      // msg: 'Failed to get catalog status'
    });
  }
});

router.post('/api/catalog/status', verifyToken, async (req, res) => {
  try {
    const { catalogRequestSubmitted, adminApprovalStatus } = req.body;

    console.log('💾 Setting catalog status to cookies for user:', req.userEmail || req.userId);
    console.log('🍪 Setting values:', {
      catalogRequestSubmitted,
      adminApprovalStatus
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    if (catalogRequestSubmitted !== undefined) {
      res.cookie('catalogRequestSubmitted', catalogRequestSubmitted.toString(), cookieOptions);
    }

    if (adminApprovalStatus !== undefined) {
      res.cookie('adminApprovalStatus', adminApprovalStatus, cookieOptions);
    }

    res.json({
      status: 'success',
      msg: 'Catalog status saved to cookies successfully',
      data: {
        catalogRequestSubmitted,
        adminApprovalStatus
      }
    });

  } catch (error) {
    console.error('❌ Error setting catalog status to cookies:', error);
    res.status(500).json({
      status: 'error',
      msg: 'Failed to save catalog status'
    });
  }
});

router.delete('/api/catalog/status', verifyToken, async (req, res) => {
  try {
    console.log('🗑️ Clearing catalog status cookies for user:', req.userEmail || req.userId);

    const clearCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0)
    };

    res.clearCookie('catalogRequestSubmitted', clearCookieOptions);
    res.clearCookie('adminApprovalStatus', clearCookieOptions);

    res.json({
      status: 'success',
      msg: 'Catalog status cookies cleared successfully'
    });

  } catch (error) {
    console.error('❌ Error clearing catalog status cookies:', error);
    res.status(500).json({
      status: 'error',
      msg: 'Failed to clear catalog status'
    });
  }
});

router.get('/api/debug/cookies', verifyToken, async (req, res) => {
  try {
    console.log('🛠 Debug: Checking all cookies for user:', req.userEmail || req.userId);

    const allCookies = req.cookies;
    const catalogCookies = {
      catalogRequestSubmitted: req.cookies.catalogRequestSubmitted,
      adminApprovalStatus: req.cookies.adminApprovalStatus
    };

    console.log('🍪 All cookies:', allCookies);
    console.log('🗂️ Catalog-specific cookies:', catalogCookies);

    res.json({
      status: 'success',
      data: {
        all_cookies: allCookies,
        catalog_cookies: catalogCookies,
        user: {
          id: req.userId,
          name: req.userName,
          email: req.userEmail
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in debug cookies:', error);
    res.status(500).json({
      status: 'error',
      msg: 'Debug error'
    });
  }
});



// ==================== EMAIL NOTIFICATION ROUTES ====================
router.get('/api/email/test-connection', testEmailConnection);
router.post('/api/email/catalog-review', verifyToken, sendCatalogReviewEmail);
router.post('/api/email/catalog-approved', verifyAdminToken, sendCatalogApprovedEmailController);
router.post('/api/email/catalog-rejected', verifyAdminToken, sendCatalogRejectedEmailController);

router.post('/api/email/admin/approve-user', verifyAdminToken, async (req, res) => {
  try {
    const { userId, email, name } = req.body;

    if (!userId || !email || !name) {
      return res.status(400).json({
        success: false,
        msg: 'User ID, email, dan nama harus diisi'
      });
    }

    console.log('👨‍💼 Admin approving catalog access for user:', userId);

    const approvalReq = {
      ...req,
      params: { userId }
    };

    let approvalResult;
    const approvalRes = {
      ...res,
      json: (data) => { approvalResult = data; return data; },
      status: (code) => ({ json: (data) => { approvalResult = { ...data, statusCode: code }; return data; } })
    };

    await approveCatalogRequest(approvalReq, approvalRes);

    if (approvalResult && !approvalResult.msg?.includes('gagal')) {
      const emailReq = {
        ...req,
        body: { email, name }
      };

      let emailResult;
      const emailRes = {
        ...res,
        json: (data) => { emailResult = data; return data; },
        status: (code) => ({ json: (data) => { emailResult = { ...data, statusCode: code }; return data; } })
      };

      await sendCatalogApprovedEmailController(emailReq, emailRes);

      return res.json({
        success: true,
        msg: `Catalog access berhasil disetujui dan email telah dikirim ke ${name}`,
        approval: approvalResult,
        email: emailResult
      });
    } else {
      return res.status(400).json({
        success: false,
        msg: 'Gagal menyetujui catalog access',
        error: approvalResult
      });
    }

  } catch (error) {
    console.error('❌ Error in admin approval with email:', error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        msg: 'Server error saat approval user',
        error: error.message
      });
    }
  }
});

router.post('/api/email/admin/reject-user', verifyAdminToken, async (req, res) => {
  try {
    const { userId, email, name, reason } = req.body;

    if (!userId || !email || !name) {
      return res.status(400).json({
        success: false,
        msg: 'User ID, email, dan nama harus diisi'
      });
    }

    console.log('👨‍💼 Admin rejecting catalog access for user:', userId);

    const rejectionReq = {
      ...req,
      params: { userId },
      body: { ...req.body, reason }
    };

    let rejectionResult;
    const rejectionRes = {
      ...res,
      json: (data) => { rejectionResult = data; return data; },
      status: (code) => ({ json: (data) => { rejectionResult = { ...data, statusCode: code }; return data; } })
    };

    await rejectCatalogRequest(rejectionReq, rejectionRes);

    if (rejectionResult && !rejectionResult.msg?.includes('gagal')) {
      const emailReq = {
        ...req,
        body: { email, name, reason }
      };

      let emailResult;
      const emailRes = {
        ...res,
        json: (data) => { emailResult = data; return data; },
        status: (code) => ({ json: (data) => { emailResult = { ...data, statusCode: code }; return data; } })
      };

      await sendCatalogRejectedEmailController(emailReq, emailRes);

      return res.json({
        success: true,
        msg: `Catalog access berhasil ditolak dan email telah dikirim ke ${name}`,
        rejection: rejectionResult,
        email: emailResult
      });
    } else {
      return res.status(400).json({
        success: false,
        msg: 'Gagal menolak catalog access',
        error: rejectionResult
      });
    }

  } catch (error) {
    console.error('❌ Error in admin rejection with email:', error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        msg: 'Server error saat reject user',
        error: error.message
      });
    }
  }
});

router.post('/api/email/test', testEmailSending);

// ==================== GALERY PUBLIC ROUTES ====================
router.get('/api/galery', getAllGalery);
router.get('/api/galery/:id', getGaleryById);
router.post('/api/galery', verifyAdminToken, createGalery);
router.put('/api/galery/:id', verifyAdminToken, updateGalery);
router.delete('/api/galery/:id', verifyAdminToken, deleteGalery);


// ==================== ADMIN AUTH ROUTES ====================
router.post('/admin/create', createAdmin);
router.post('/admin/login', loginAdmin);
router.get('/admin/token', refreshAdminToken);
router.delete('/admin/logout', logoutAdmin);

router.get('/admin/profile', verifyAdminToken, getAdmin);
router.get('/admin/all', verifyAdminToken, requireSuperAdmin, getAllAdmins);
router.put('/admin/:adminId/status', verifyAdminToken, requireSuperAdmin, updateAdminStatus);
router.put('/admin/:adminId/password', verifyAdminToken, updateAdminPassword);

// ==================== GALERY ROUTES ====================
router.get('/api/galery', getAllGalery);
router.get('/api/galery/:id', getGaleryById);
router.post('/api/galery', verifyAdminToken, createGalery);
router.put('/api/galery/:id', verifyAdminToken, updateGalery);
router.delete('/api/galery/:id', verifyAdminToken, deleteGalery);

// ==================== RECIPE ROUTES ====================
//dataikan
router.post('/api/save-to-dataikan', upload.single('image'), saveToDataIkan);
router.get('/api/data-ikan', getAllDataIkan);

// Public routes (anyone can view recipes)
router.get('/api/recipes', getAllRecipes);
router.get('/api/recipes/fish-names', getUniqueFishNames);
router.get('/api/recipes/:id', getRecipeById);
router.get('/api/recipes/fish/:fishName', getRecipesByFishName);

router.post('/api/recipes', verifyAdminToken, createRecipe);
router.put('/api/recipes/:id', verifyAdminToken, updateRecipe);
router.delete('/api/recipes/:id', verifyAdminToken, deleteRecipe);

export default router;