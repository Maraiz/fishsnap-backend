// routes/index.js - CLEAN, NO DUPLICATE, PRODUCTION READY

import express from 'express';
import path from 'path';
import multer from 'multer';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

// ==================== CONTROLLERS ====================
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
  getCatalog,
} from '../controllers/Models.js';

import {
  getAllDataIkan,
  getDataIkanById,
  getMyDataIkan,
  saveToDataIkan,
  updateDataIkan,
  deleteDataIkan,
  getDataIkanStatistics,
} from '../controllers/Histori.js';

import {
  getAllGalery,
  getGaleryById,
  createGalery,
  updateGalery,
  deleteGalery,
} from '../controllers/Galery.js';

import {
  getAllRecipes,
  getRecipeById,
  getRecipesByFishName,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getUniqueFishNames,
} from '../controllers/Recipe.js';

import {
  sendCatalogReviewEmail,
  sendCatalogApprovedEmailController,
  sendCatalogRejectedEmailController,
  testEmailConnection,
  testEmailSending,
} from '../controllers/EmailController.js';

import {
  getAdmin,
  createAdmin,
  loginAdmin,
  logoutAdmin,
  getAllAdmins,
  updateAdminStatus,
  updateAdminPassword,
} from '../controllers/Admin.js';

import { refreshToken } from '../controllers/RefreshToken.js';
import { refreshAdminToken } from '../controllers/AdminRefreshToken.js';

// ==================== MIDDLEWARE ====================
import { verifyToken } from '../middleware/VerifyToken.js';
import { verifyAdminToken, requireSuperAdmin } from '../middleware/VerifyAdminToken.js';

import Users from '../models/userModel.js';

const router = express.Router();

// ==================== MULTER ====================
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ==================== AUTH (USER) ====================
router.post('/users', Register);
router.post('/login', Login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/token', refreshToken);
router.delete('/logout', Logout);
router.get('/users', verifyToken, getUsers);

// ==================== USER PROFILE ====================
router.put('/users/update', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, email, password, phone, gender, birthday } = req.body;
    const updateData = {};

    if (name) updateData.name = name;

    if (email) {
      const exists = await Users.findOne({ where: { email, id: { [Op.ne]: userId } } });
      if (exists) return res.status(400).json({ msg: 'Email sudah digunakan' });
      updateData.email = email;
    }

    if (password && password !== '***********') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (phone) updateData.phone = phone;
    if (gender) updateData.gender = gender;
    if (birthday) updateData.birthday = birthday;

    await Users.update(updateData, { where: { id: userId } });
    res.json({ msg: 'Profil berhasil diperbarui' });
  } catch (e) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ==================== ML ====================
router.post('/predict', predictTabular);
router.post('/predict-image', upload.single('image'), predictImage);

// ==================== SCAN & CATALOG ====================
router.post('/api/save-scan', upload.single('image'), saveScan);
router.post('/api/save-to-catalog', verifyToken, upload.single('image'), saveToCatalog);
router.get('/api/get-scans', getScans);
router.get('/api/get-catalog', getCatalog);

// ==================== DATA IKAN ====================
router.get('/api/data-ikan/all', verifyToken, getAllDataIkan);
router.get('/api/data-ikan/statistics', verifyToken, getDataIkanStatistics);
router.get('/api/data-ikan/my', verifyToken, getMyDataIkan);
router.post('/api/data-ikan', verifyToken, upload.single('image'), saveToDataIkan);
router.get('/api/data-ikan/:id', verifyToken, getDataIkanById);
router.put('/api/data-ikan/:id', verifyToken, upload.single('image'), updateDataIkan);
router.delete('/api/data-ikan/:id', verifyToken, deleteDataIkan);

// ==================== GALERY ====================
router.get('/api/galery', getAllGalery);
router.get('/api/galery/:id', getGaleryById);
router.post('/api/galery', verifyAdminToken, createGalery);
router.put('/api/galery/:id', verifyAdminToken, updateGalery);
router.delete('/api/galery/:id', verifyAdminToken, deleteGalery);

// ==================== RECIPES ====================
router.get('/api/recipes', getAllRecipes);
router.get('/api/recipes/fish-names', getUniqueFishNames);
router.get('/api/recipes/fish/:fishName', getRecipesByFishName);
router.get('/api/recipes/:id', getRecipeById);
router.post('/api/recipes', verifyAdminToken, createRecipe);
router.put('/api/recipes/:id', verifyAdminToken, updateRecipe);
router.delete('/api/recipes/:id', verifyAdminToken, deleteRecipe);

// ==================== EMAIL ====================
router.get('/api/email/test-connection', testEmailConnection);
router.post('/api/email/test', testEmailSending);
router.post('/api/email/catalog-review', verifyToken, sendCatalogReviewEmail);
router.post('/api/email/catalog-approved', verifyAdminToken, sendCatalogApprovedEmailController);
router.post('/api/email/catalog-rejected', verifyAdminToken, sendCatalogRejectedEmailController);

// ==================== ADMIN ====================
router.post('/admin/create', createAdmin);
router.post('/admin/login', loginAdmin);
router.get('/admin/token', refreshAdminToken);
router.delete('/admin/logout', logoutAdmin);
router.get('/admin/profile', verifyAdminToken, getAdmin);
router.get('/admin/all', verifyAdminToken, requireSuperAdmin, getAllAdmins);
router.put('/admin/:adminId/status', verifyAdminToken, requireSuperAdmin, updateAdminStatus);
router.put('/admin/:adminId/password', verifyAdminToken, updateAdminPassword);

export default router;