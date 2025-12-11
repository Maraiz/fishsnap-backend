// controllers/Histori.js - SECURE VERSION with Authentication
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DataIkan from '../models/dataIkanModel.js';
import Users from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import sequelize from '../config/Database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const readFile = promisify(fs.readFile);

// Helper function untuk get user ID dari token
const getUserIdFromToken = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    return decoded.userId;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Helper function untuk convert image to base64
const convertImageToBase64 = async (imagePath) => {
  try {
    const imageBuffer = await readFile(imagePath);
    const base64String = imageBuffer.toString('base64');
    const mimeType = path.extname(imagePath).toLowerCase() === '.png' 
      ? 'image/png' 
      : 'image/jpeg';
    return `data:${mimeType};base64,${base64String}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
};

/**
 * 🔒 GET MY DATA IKAN (SECURE - AUTHENTICATED USER ONLY)
 * Mengambil data histori ikan HANYA milik user yang sedang login
 */
export const getMyDataIkan = async (req, res) => {
  try {
    // 🔐 CRITICAL: Get user ID from token (from middleware)
    const userId = req.userId;

    if (!userId) {
      console.error('❌ Unauthorized access attempt - No user ID');
      return res.status(401).json({
        status: 'error',
        message: 'Anda harus login untuk mengakses data ini'
      });
    }

    console.log('👤 Fetching data ikan for authenticated user:', userId);

    const { limit = 50, offset = 0 } = req.query;

    // 🔒 SECURITY: WHERE clause MUST include userId
    const data = await DataIkan.findAll({
      where: { userId: userId }, // ✅ Only get data for THIS user
      include: [{ 
        model: Users, 
        as: 'user', 
        attributes: ['id', 'name', 'email'] 
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Format response
    const formatted = data.map(item => {
      let topPredictions = [];
      try {
        if (item.notes && item.notes.includes('Top 3 predictions:')) {
          const notesJson = item.notes.replace('Top 3 predictions: ', '');
          topPredictions = JSON.parse(notesJson);
        }
      } catch (e) {
        console.error('Error parsing top predictions:', e);
      }

      return {
        id: item.id,
        date: item.createdAt,
        status: "completed",
        fishData: {
          name: item.namaIkan,
          predicted_class: item.predictedClass,
          confidence: `${(item.probability * 100).toFixed(1)}%`,
          habitat: item.habitat,
          konsumsi: item.konsumsi,
          icon: "🐟",
          top_predictions: topPredictions
        },
        image: item.fishImage,
        user: item.user,
        created_at: item.createdAt,
        updated_at: item.updatedAt
      };
    });

    console.log(`✅ Found ${formatted.length} records for user ${userId}`);

    res.json({
      status: 'success',
      data: formatted,
      count: formatted.length,
      userId: userId // Include userId in response for verification
    });

  } catch (err) {
    console.error('❌ Error fetching user data ikan:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

/**
 * 🔒 GET ALL DATA IKAN (ADMIN ONLY)
 * Hanya admin yang bisa melihat semua data
 */
export const getAllDataIkan = async (req, res) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Check if user is admin
    const user = await Users.findByPk(userId);
    if (!user || user.role !== 'admin') {
      console.log('⚠️ Non-admin user trying to access all data:', userId);
      return res.status(403).json({
        status: 'error',
        message: 'Akses ditolak. Hanya admin yang dapat melihat semua data.'
      });
    }

    console.log('👨‍💼 Admin fetching all data ikan');

    const { limit = 50, offset = 0, targetUserId } = req.query;

    // Admin can filter by specific user if needed
    const whereClause = targetUserId ? { userId: targetUserId } : {};

    const data = await DataIkan.findAll({
      where: whereClause,
      include: [{ 
        model: Users, 
        as: 'user', 
        attributes: ['id', 'name', 'email'] 
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const formatted = data.map(item => {
      let topPredictions = [];
      try {
        if (item.notes && item.notes.includes('Top 3 predictions:')) {
          const notesJson = item.notes.replace('Top 3 predictions: ', '');
          topPredictions = JSON.parse(notesJson);
        }
      } catch (e) {
        console.error('Error parsing top predictions:', e);
      }

      return {
        id: item.id,
        date: item.createdAt,
        status: "completed",
        fishData: {
          name: item.namaIkan,
          predicted_class: item.predictedClass,
          confidence: `${(item.probability * 100).toFixed(1)}%`,
          habitat: item.habitat,
          konsumsi: item.konsumsi,
          icon: "🐟",
          top_predictions: topPredictions
        },
        image: item.fishImage,
        user: item.user,
        created_at: item.createdAt,
        updated_at: item.updatedAt
      };
    });

    console.log(`✅ Admin fetched ${formatted.length} records`);

    res.json({ 
      status: "success", 
      data: formatted,
      count: formatted.length,
      total: data.length,
      requestedBy: 'admin'
    });

  } catch (err) {
    console.error("❌ Error fetching data_ikan:", err);
    res.status(500).json({ 
      status: "error", 
      message: err.message
    });
  }
};

/**
 * 🔒 GET DATA IKAN BY ID (WITH OWNERSHIP CHECK)
 * User hanya bisa melihat data miliknya sendiri, admin bisa lihat semua
 */
export const getDataIkanById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    console.log('🔍 Fetching data ikan with ID:', id, 'by user:', userId);

    const data = await DataIkan.findByPk(id, {
      include: [{ 
        model: Users, 
        as: 'user', 
        attributes: ['id', 'name', 'email'] 
      }]
    });

    if (!data) {
      return res.status(404).json({
        status: 'error',
        message: 'Data ikan tidak ditemukan'
      });
    }

    // 🔒 SECURITY CHECK: Verify ownership
    const currentUser = await Users.findByPk(userId);
    if (data.userId !== userId && currentUser.role !== 'admin') {
      console.log('⚠️ Unauthorized access attempt to data:', id, 'by user:', userId);
      return res.status(403).json({
        status: 'error',
        message: 'Anda tidak memiliki akses ke data ini'
      });
    }

    // Parse top predictions
    let topPredictions = [];
    try {
      if (data.notes && data.notes.includes('Top 3 predictions:')) {
        const notesJson = data.notes.replace('Top 3 predictions: ', '');
        topPredictions = JSON.parse(notesJson);
      }
    } catch (e) {
      console.error('Error parsing top predictions:', e);
    }

    const formatted = {
      id: data.id,
      date: data.createdAt,
      status: "completed",
      fishData: {
        name: data.namaIkan,
        predicted_class: data.predictedClass,
        confidence: `${(data.probability * 100).toFixed(1)}%`,
        habitat: data.habitat,
        konsumsi: data.konsumsi,
        icon: "🐟",
        top_predictions: topPredictions
      },
      image: data.fishImage,
      user: data.user,
      created_at: data.createdAt,
      updated_at: data.updatedAt
    };

    console.log('✅ Data ikan found and access authorized');

    res.json({
      status: 'success',
      data: formatted
    });

  } catch (err) {
    console.error('❌ Error fetching data ikan by ID:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

/**
 * 🔒 SAVE TO DATA IKAN (WITH USER ID FROM TOKEN)
 * Menyimpan data ikan dengan userId dari token
 */
export const saveToDataIkan = async (req, res) => {
  try {
    console.log('💾 Saving new data to data_ikan...');

    // 🔐 CRITICAL: Get user ID from token (from middleware)
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Anda harus login untuk menyimpan data' 
      });
    }

    console.log('👤 Saving data for authenticated user:', userId);

    const { 
      fish_name, 
      predicted_class, 
      confidence, 
      habitat, 
      konsumsi, 
      top_predictions, 
      notes 
    } = req.body;

    // Validasi input
    if (!fish_name || !predicted_class || !confidence) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'fish_name, predicted_class, dan confidence harus diisi' 
      });
    }

    // Convert image to base64 jika ada file
    let fishImageBase64 = null;
    if (req.file) {
      console.log('🖼️ Converting image to base64...');
      fishImageBase64 = await convertImageToBase64(req.file.path);
      
      try {
        await fs.promises.unlink(req.file.path);
        console.log('🗑️ Temporary file deleted');
      } catch (unlinkErr) {
        console.error('Warning: Could not delete temp file:', unlinkErr);
      }
    }

    // Parse top_predictions
    let topPredictionsStr = top_predictions;
    if (typeof top_predictions === 'object') {
      topPredictionsStr = JSON.stringify(top_predictions);
    }

    // 🔒 Create new record with AUTHENTICATED user ID
    const newData = await DataIkan.create({
      userId: userId, // ✅ Use authenticated user ID
      namaIkan: fish_name,
      predictedClass: predicted_class,
      probability: parseFloat(confidence) / 100,
      habitat: habitat || 'Tidak diketahui',
      konsumsi: konsumsi || 'Tidak diketahui',
      fishImage: fishImageBase64,
      notes: notes || `Top 3 predictions: ${topPredictionsStr || '[]'}`
    });

    console.log('✅ Data berhasil disimpan dengan ID:', newData.id, 'untuk user:', userId);

    // Fetch saved data with user relation
    const savedData = await DataIkan.findByPk(newData.id, {
      include: [{ 
        model: Users, 
        as: 'user', 
        attributes: ['id', 'name', 'email'] 
      }]
    });

    res.json({ 
      status: 'success', 
      message: 'Data berhasil disimpan ke data_ikan', 
      data: {
        id: savedData.id,
        userId: savedData.userId,
        namaIkan: savedData.namaIkan,
        predictedClass: savedData.predictedClass,
        probability: `${(savedData.probability * 100).toFixed(2)}%`,
        habitat: savedData.habitat,
        konsumsi: savedData.konsumsi,
        hasImage: !!savedData.fishImage,
        created_at: savedData.createdAt,
        user: savedData.user
      }
    });

  } catch (err) {
    console.error('❌ Error saving to data_ikan:', err);
    res.status(500).json({ 
      status: 'error', 
      message: err.message
    });
  }
};

/**
 * 🔒 UPDATE DATA IKAN (WITH OWNERSHIP CHECK)
 * User hanya bisa update data miliknya sendiri
 */
export const updateDataIkan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    console.log('✏️ Updating data ikan:', id, 'by user:', userId);

    const existingData = await DataIkan.findByPk(id);
    if (!existingData) {
      return res.status(404).json({
        status: 'error',
        message: 'Data ikan tidak ditemukan'
      });
    }

    // 🔒 SECURITY CHECK: Verify ownership
    const currentUser = await Users.findByPk(userId);
    if (existingData.userId !== userId && currentUser.role !== 'admin') {
      console.log('⚠️ Unauthorized update attempt by user:', userId);
      return res.status(403).json({
        status: 'error',
        message: 'Anda tidak memiliki akses untuk mengupdate data ini'
      });
    }

    const updateData = {};
    if (req.body.fish_name) updateData.namaIkan = req.body.fish_name;
    if (req.body.predicted_class) updateData.predictedClass = req.body.predicted_class;
    if (req.body.confidence) updateData.probability = parseFloat(req.body.confidence) / 100;
    if (req.body.habitat) updateData.habitat = req.body.habitat;
    if (req.body.konsumsi) updateData.konsumsi = req.body.konsumsi;
    if (req.body.notes) updateData.notes = req.body.notes;

    if (req.file) {
      updateData.fishImage = await convertImageToBase64(req.file.path);
      try {
        await fs.promises.unlink(req.file.path);
      } catch (unlinkErr) {
        console.error('Warning: Could not delete temp file:', unlinkErr);
      }
    }

    await DataIkan.update(updateData, { where: { id } });

    const updatedData = await DataIkan.findByPk(id, {
      include: [{ 
        model: Users, 
        as: 'user', 
        attributes: ['id', 'name', 'email'] 
      }]
    });

    console.log('✅ Data ikan updated successfully');

    res.json({
      status: 'success',
      message: 'Data ikan berhasil diupdate',
      data: updatedData
    });

  } catch (err) {
    console.error('❌ Error updating data ikan:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

/**
 * 🔒 DELETE DATA IKAN (WITH OWNERSHIP CHECK)
 * User hanya bisa delete data miliknya sendiri
 */
export const deleteDataIkan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    console.log('🗑️ Deleting data ikan:', id, 'by user:', userId);

    const existingData = await DataIkan.findByPk(id);
    if (!existingData) {
      return res.status(404).json({
        status: 'error',
        message: 'Data ikan tidak ditemukan'
      });
    }

    // 🔒 SECURITY CHECK: Verify ownership
    const currentUser = await Users.findByPk(userId);
    if (existingData.userId !== userId && currentUser.role !== 'admin') {
      console.log('⚠️ Unauthorized delete attempt by user:', userId);
      return res.status(403).json({
        status: 'error',
        message: 'Anda tidak memiliki akses untuk menghapus data ini'
      });
    }

    await DataIkan.destroy({ where: { id } });

    console.log('✅ Data ikan deleted successfully');

    res.json({
      status: 'success',
      message: 'Data ikan berhasil dihapus'
    });

  } catch (err) {
    console.error('❌ Error deleting data ikan:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

/**
 * 🔒 GET STATISTICS (USER-SPECIFIC)
 * Statistik hanya untuk data user yang login
 */
export const getDataIkanStatistics = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    console.log('📊 Getting statistics for user:', userId);

    // 🔒 Statistics ONLY for authenticated user
    const whereClause = { userId: userId };

    const totalRecords = await DataIkan.count({ where: whereClause });

    const byClass = await DataIkan.findAll({
      where: whereClause,
      attributes: [
        'predictedClass',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['predictedClass'],
      order: [[sequelize.literal('count'), 'DESC']]
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentScans = await DataIkan.count({
      where: {
        ...whereClause,
        createdAt: { [Op.gte]: sevenDaysAgo }
      }
    });

    res.json({
      status: 'success',
      data: {
        total_records: totalRecords,
        recent_scans: recentScans,
        by_class: byClass,
        period: {
          start: sevenDaysAgo,
          end: new Date()
        },
        userId: userId
      }
    });

  } catch (err) {
    console.error('❌ Error getting statistics:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};