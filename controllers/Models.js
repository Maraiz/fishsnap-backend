// controllers/Models.js - Updated (Data Ikan dipindah ke Histori.js)
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { promisify } from 'util';
import FishPredictions from '../models/fishPredictionModel.js';
import Users from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';

// Untuk ES module (__dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisify untuk async/await
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);

// Helper function untuk handle Python process
const handlePythonProcess = (python, res) => {
  let output = '';
  let responded = false;

  python.stdout.on('data', (data) => {
    output += data.toString();
  });

  python.stderr.on('data', (data) => {
    const errMsg = data.toString();
    console.error('Python stderr:', errMsg);

    const isRealError =
      errMsg.includes('Traceback') ||
      errMsg.toLowerCase().includes('error') ||
      errMsg.toLowerCase().includes('exception');

    if (!responded && isRealError) {
      responded = true;
      res.status(500).json({
        error: 'Model prediction failed: ' + errMsg,
        status: 'error',
      });
    }
  });

  python.on('close', () => {
    if (responded) return;

    try {
      const result = JSON.parse(output);
      responded = true;
      res.json(result);
    } catch (err) {
      responded = true;
      res.status(500).json({
        error: 'Failed to parse output: ' + err.message,
        status: 'error',
      });
    }
  });

  // Timeout handler
  setTimeout(() => {
    if (!responded) {
      responded = true;
      python.kill();
      res.status(500).json({
        error: 'Python script timeout',
        status: 'error',
      });
    }
  }, 30000);
};

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
    const mimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${base64String}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
};

// Helper function untuk copy file gambar ke folder permanent
const copyImageToDataFolder = async (tempPath, newFilename) => {
  try {
    const dataDir = path.join(__dirname, '..', 'data', 'images');
    
    // Pastikan folder images ada
    try {
      await mkdir(dataDir, { recursive: true });
    } catch (err) {
      // Folder sudah ada
    }

    const newPath = path.join(dataDir, newFilename);
    
    // Copy file
    await fs.promises.copyFile(tempPath, newPath);
    
    return `data/images/${newFilename}`;
  } catch (error) {
    console.error('Error copying image:', error);
    return tempPath; // Return original path as fallback
  }
};

// ==================== ML PREDICTION FUNCTIONS ====================

/**
 * Tabular prediction
 * Melakukan prediksi menggunakan data tabular (array features)
 */
export const predictTabular = (req, res) => {
  const features = req.body.features;

  if (!features || !Array.isArray(features)) {
    return res.status(400).json({
      error: 'Features array is required',
      status: 'error',
    });
  }

  const scriptPath = path.join(__dirname, '..', 'models', 'predict.py');
  const python = spawn('python', [scriptPath, JSON.stringify(features)]);

  handlePythonProcess(python, res);
};

/**
 * Image prediction
 * Melakukan prediksi menggunakan gambar
 */
export const predictImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'Image file is required',
      status: 'error',
    });
  }

  const imagePath = req.file.path;
  const scriptPath = path.join(__dirname, '..', 'models', 'predict.py');
  // Tambahkan confidence threshold (opsional, default 0.3)
  const confThreshold = req.body.confThreshold || 0.3;
  const python = spawn('python', [scriptPath, 'image', imagePath, confThreshold.toString()]);

  handlePythonProcess(python, res);
};

// ==================== SCAN FUNCTIONS (FishPredictions) ====================

/**
 * Save scan result to database
 * Menyimpan hasil scan ke tabel fish_predictions
 */
export const saveScan = async (req, res) => {
  try {
    console.log('=== Save Scan to Database ===');
    console.log('Body:', req.body);
    console.log('File:', req.file);

    let userId = getUserIdFromToken(req);
    if (!userId) {
      userId = req.body.userId || req.user?.id || 1;
      console.log('Using fallback userId:', userId);
    }

    const {
      fish_name,
      predicted_class,
      confidence,
      habitat,
      konsumsi,
      top_predictions,
      notes,
      boxes // Tambahkan field untuk bounding box
    } = req.body;

    if (!fish_name || !predicted_class || !confidence) {
      return res.status(400).json({
        status: 'error',
        message: 'fish_name, predicted_class, dan confidence harus diisi',
      });
    }

    let fishImageBase64 = null;
    if (req.file) {
      fishImageBase64 = await convertImageToBase64(req.file.path);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = path.extname(req.file.originalname);
      const newFilename = `scan_${timestamp}${extension}`;
      await copyImageToDataFolder(req.file.path, newFilename);
    }

    const predictionData = {
      userId: userId,
      predictedFishName: fish_name || predicted_class,
      probability: parseFloat(confidence) / 100,
      habitat: habitat || 'Tidak diketahui',
      consumptionSafety: konsumsi || 'Tidak diketahui',
      fishImage: fishImageBase64,
      notes: notes || `Top 3 predictions: ${top_predictions || '[]'} | Boxes: ${JSON.stringify(boxes || [])}`
    };

    console.log('Saving to database:', {
      ...predictionData,
      fishImage: fishImageBase64 ? '[BASE64_DATA]' : null
    });

    const savedPrediction = await FishPredictions.create(predictionData);

    console.log('Data saved to database successfully:', savedPrediction.id);

    res.json({
      status: 'success',
      message: 'Data berhasil disimpan ke database',
      success: true,
      data: {
        id: savedPrediction.id,
        fish_name: savedPrediction.predictedFishName,
        predicted_class: savedPrediction.predictedFishName,
        confidence: (savedPrediction.probability * 100).toFixed(2) + '%',
        habitat: savedPrediction.habitat,
        consumption_safety: savedPrediction.consumptionSafety,
        prediction_date: savedPrediction.predictionDate,
        prediction_time: savedPrediction.predictionTime,
        created_at: savedPrediction.createdAt,
        boxes: boxes || [] // Kembalikan bounding box dalam respons
      }
    });

  } catch (error) {
    console.error('Error saving scan to database:', error);
    res.status(500).json({
      status: 'error',
      message: `Gagal menyimpan data: ${error.message}`,
      success: false
    });
  }
};

/**
 * Save to catalog
 * Menyimpan data ke katalog (memerlukan role contributor/admin)
 */
export const saveToCatalog = async (req, res) => {
  try {
    console.log('=== SAVE TO CATALOG DEBUG ===');
    console.log('User from middleware:', {
      userId: req.userId,
      email: req.email,
      name: req.name
    });

    const userId = req.userId;
    if (!userId) {
      console.error('❌ No user ID from middleware!');
      return res.status(401).json({
        status: 'error',
        message: 'User tidak teridentifikasi. Silakan login ulang.'
      });
    }

    const user = await Users.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User tidak ditemukan'
      });
    }

    if (user.role !== 'contributor' && user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Akses ditolak. Anda perlu menjadi kontributor untuk menambah ke katalog.'
      });
    }

    const {
      fish_name,
      predicted_class,
      probability,
      habitat,
      konsumsi,
      top_predictions,
      notes,
      boxes,
      deskripsi_tambahan,
      lokasi_penangkapan,
      tanggal_ditemukan,
      kondisi_ikan
    } = req.body;

    if (!fish_name || !predicted_class || !probability) {
      return res.status(400).json({
        status: 'error',
        message: 'fish_name, predicted_class, dan probability harus diisi',
      });
    }

    let fishImageBase64 = null;
    if (req.file) {
      fishImageBase64 = await convertImageToBase64(req.file.path);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = path.extname(req.file.originalname);
      const newFilename = `catalog_${userId}_${timestamp}${extension}`;
      await copyImageToDataFolder(req.file.path, newFilename);
    }

    const catalogData = {
      userId: userId,
      predictedFishName: fish_name || predicted_class,
      namaIkan: fish_name || predicted_class,
      probability: parseFloat(probability),
      habitat: habitat || 'Tidak diketahui',
      consumptionSafety: konsumsi || 'Tidak diketahui',
      fishImage: fishImageBase64,
      notes: notes || `CATALOG ITEM - Top 3 predictions: ${top_predictions || '[]'} | Boxes: ${JSON.stringify(boxes || [])}`,
      kategori: konsumsi?.includes('konsumsi') ? 'Ikan Konsumsi' : 'Ikan Hias',
      deskripsiTambahan: deskripsi_tambahan || '',
      lokasiPenangkapan: lokasi_penangkapan || '',
      tanggalDitemukan: tanggal_ditemukan || null,
      kondisiIkan: kondisi_ikan || 'mati',
      amanDikonsumsi: konsumsi?.toLowerCase().includes('aman') || konsumsi?.toLowerCase().includes('konsumsi') || false,
      jauhDariPabrik: req.body.jauh_dari_pabrik || true
    };

    console.log('📝 Saving catalog data:', {
      userId: catalogData.userId,
      fish_name: catalogData.predictedFishName,
      namaIkan: catalogData.namaIkan
    });

    const savedCatalog = await FishPredictions.create(catalogData);

    console.log('✅ Catalog saved successfully:', {
      id: savedCatalog.id,
      userId: savedCatalog.userId,
      fishName: savedCatalog.namaIkan
    });

    res.json({
      status: 'success',
      message: `Data berhasil ditambahkan ke katalog oleh ${user.name}`,
      success: true,
      data: {
        id: savedCatalog.id,
        userId: savedCatalog.userId,
        fish_name: savedCatalog.namaIkan,
        predicted_class: savedCatalog.predictedFishName,
        probability: (savedCatalog.probability * 100).toFixed(2) + '%',
        habitat: savedCatalog.habitat,
        consumption_safety: savedCatalog.consumptionSafety,
        fish_image: savedCatalog.fishImage,
        created_at: savedCatalog.createdAt,
        contributor: user.name,
        kategori: savedCatalog.kategori,
        deskripsi_tambahan: savedCatalog.deskripsiTambahan,
        lokasi_penangkapan: savedCatalog.lokasiPenangkapan,
        tanggal_ditemukan: savedCatalog.tanggalDitemukan,
        kondisi_ikan: savedCatalog.kondisiIkan,
        aman_dikonsumsi: savedCatalog.amanDikonsumsi,
        jauh_dari_pabrik: savedCatalog.jauhDariPabrik,
        boxes: boxes || []
      }
    });

  } catch (error) {
    console.error('❌ Error saving to catalog:', error);
    res.status(500).json({
      status: 'error',
      message: `Gagal menambahkan ke katalog: ${error.message}`,
      success: false
    });
  }
};

// ==================== GET DATA FROM DATABASE ====================

/**
 * Get Scans
 * Mengambil data scan dari fish_predictions
 */
export const getScans = async (req, res) => {
  try {
    let userId = getUserIdFromToken(req);
    let whereClause = {};
    
    // Filter by userId if authenticated
    if (userId) {
      whereClause.userId = userId;
    }

    // Exclude catalog items
    whereClause.notes = {
      [Op.notLike]: '%CATALOG%'
    };

    const scans = await FishPredictions.findAll({
      where: whereClause,
      include: [{
        model: Users,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    const formattedScans = scans.map(scan => {
      let boxes = [];
      try {
        const notesParts = scan.notes?.split('| Boxes: ') || [];
        if (notesParts[1]) {
          boxes = JSON.parse(notesParts[1]);
        }
      } catch (e) {
        console.error('Error parsing boxes from notes:', e);
      }

      return {
        id: scan.id,
        fish_name: scan.predictedFishName,
        predicted_class: scan.predictedFishName,
        probability: (scan.probability * 100).toFixed(2) + '%',
        habitat: scan.habitat,
        consumption_safety: scan.consumptionSafety,
        fish_image: scan.fishImage,
        prediction_date: scan.predictionDate,
        prediction_time: scan.predictionTime,
        notes: scan.notes,
        nama_ikan: scan.namaIkan,
        kategori: scan.kategori,
        aman_dikonsumsi: scan.amanDikonsumsi,
        created_at: scan.createdAt,
        updated_at: scan.updatedAt,
        user: scan.user,
        boxes: boxes
      };
    });

    res.json({
      status: 'success',
      data: formattedScans,
      count: formattedScans.length
    });

  } catch (error) {
    console.error('Error getting scans:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get Catalog
 * Mengambil data catalog dari fish_predictions
 */
export const getCatalog = async (req, res) => {
  try {
    let userId = getUserIdFromToken(req);
    let whereClause = {
      notes: {
        [Op.like]: '%CATALOG%'
      }
    };
    
    // Optional: filter by userId if provided
    if (userId && req.query.my === 'true') {
      whereClause.userId = userId;
    }

    const catalogItems = await FishPredictions.findAll({
      where: whereClause,
      include: [{
        model: Users,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    const formattedCatalog = catalogItems.map(item => {
      let boxes = [];
      try {
        const notesParts = item.notes?.split('| Boxes: ') || [];
        if (notesParts[1]) {
          boxes = JSON.parse(notesParts[1]);
        }
      } catch (e) {
        console.error('Error parsing boxes from notes:', e);
      }

      return {
        id: item.id,
        fish_name: item.predictedFishName,
        predicted_class: item.predictedFishName,
        probability: (item.probability * 100).toFixed(2) + '%',
        habitat: item.habitat,
        consumption_safety: item.consumptionSafety,
        fish_image: item.fishImage,
        prediction_date: item.predictionDate,
        prediction_time: item.predictionTime,
        notes: item.notes,
        nama_ikan: item.namaIkan,
        kategori: item.kategori,
        deskripsi_tambahan: item.deskripsiTambahan,
        lokasi_penangkapan: item.lokasiPenangkapan,
        tanggal_ditemukan: item.tanggalDitemukan,
        kondisi_ikan: item.kondisiIkan,
        aman_dikonsumsi: item.amanDikonsumsi,
        jauh_dari_pabrik: item.jauhDariPabrik,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        user: item.user,
        boxes: boxes
      };
    });

    res.json({
      status: 'success',
      data: formattedCatalog,
      count: formattedCatalog.length
    });

  } catch (error) {
    console.error('Error getting catalog:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};