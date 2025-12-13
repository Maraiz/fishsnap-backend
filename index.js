import express from 'express';
import dotenv from 'dotenv';
import db from './config/Database.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import router from './routes/index.js';
// import './models/budidayaModel.js';


dotenv.config();
const app = express();

// Cek env
console.log('ACCESS_TOKEN_SECRET:', process.env.ACCESS_TOKEN_SECRET);
console.log('REFRESH_TOKEN_SECRET:', process.env.REFRESH_TOKEN_SECRET);

// Koneksi ke DB + Sync tabel otomatis
const connectDB = async () => {
  try {
    await db.authenticate();
    console.log('✅ Database connected');

    // 🔥 Auto create/update tabel dari model
    // await db.sync({ alter: true }); // aman, tidak hapus data
    console.log('🟢 All models synchronized');

  } catch (error) {
    console.error('❌ Database connection error:', error);
  }
};
connectDB();

import cors from 'cors';

const allowedOrigins = [
  'https://fishsnap-frontend.vercel.app',
  'https://fitcalori.my.id',
  'https://www.fitcalori.my.id',
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow request tanpa origin (Postman, curl, mobile app)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ CORS BLOCKED:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: false, // ⛔ WAJIB FALSE (karena pakai Authorization header)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ WAJIB untuk preflight (HP & Authorization)
app.options('*', cors());



app.use(cookieParser());

// Body parser untuk file base64
app.use(express.json({
  limit: '50mb',
  parameterLimit: 100000
}));
app.use(express.urlencoded({
  extended: true,
  limit: '50mb',
  parameterLimit: 100000
}));

// Folder static untuk upload file
app.use('/uploads', express.static('uploads'));

// Routing
app.use(router);

// Run server
app.listen(5000, () => {
  console.log('🚀 Server is running at http://localhost:5000');
});
