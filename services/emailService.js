// services/emailService.js - Complete Email Service
import nodemailer from 'nodemailer';

// Setup transporter untuk Gmail
const createTransporter = () => {
  // Validate environment variables
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.error('❌ Missing email credentials in environment variables');
    console.log('Required env vars: EMAIL_USER, EMAIL_PASS');
    throw new Error('Email credentials not configured');
  }

  console.log('📧 Creating email transporter for:', emailUser);

  // ⭐ FIX: Change createTransporter to createTransport
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    },
    // Additional configuration for better reliability
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Generate 6-digit OTP
export const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('🔑 Generated OTP:', otp); // Debug log (remove in production)
  return otp;
};

// Test email connection
export const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email service connection successful');
    return { success: true };
  } catch (error) {
    console.error('❌ Email service connection failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Kirim OTP via email
export const sendOTPEmail = async (email, name, otpCode) => {
  try {
    console.log('📧 Attempting to send OTP email to:', email);
    
    // Validate inputs
    if (!email || !name || !otpCode) {
      throw new Error('Missing required parameters: email, name, or otpCode');
    }

    const transporter = createTransporter();

    // Test connection first
    console.log('🔄 Testing email connection...');
    await transporter.verify();
    console.log('✅ Email connection verified');

    const mailOptions = {
      from: {
        name: 'Fishmap AI',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🐟 Kode Verifikasi Fishmap AI',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .container {
              max-width: 600px;
              margin: 0 auto;
              font-family: Arial, sans-serif;
              background-color: #f8f9fa;
              padding: 20px;
            }
            .card {
              background: white;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #4a90e2;
              margin-bottom: 10px;
            }
            .otp-code {
              background: #f0f8ff;
              border: 2px solid #4a90e2;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .code {
              font-size: 36px;
              font-weight: bold;
              color: #4a90e2;
              letter-spacing: 5px;
              margin: 10px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">🐟 Fishmap AI</div>
                <h2>Verifikasi Email Anda</h2>
              </div>
              
              <p>Halo <strong>${name}</strong>,</p>
              
              <p>Terima kasih telah mendaftar di Fishmap AI! Untuk melengkapi registrasi Anda, silakan masukkan kode verifikasi berikut:</p>
              
              <div class="otp-code">
                <div>Kode Verifikasi Anda:</div>
                <div class="code">${otpCode}</div>
                <div style="font-size: 14px; color: #666;">
                  Kode berlaku selama 10 menit
                </div>
              </div>
              
              <p>Jika Anda tidak meminta kode ini, abaikan email ini.</p>
              
              <div style="margin-top: 20px;">
                <strong>Tips keamanan:</strong>
                <ul style="color: #666; font-size: 14px;">
                  <li>Jangan bagikan kode ini kepada siapa pun</li>
                  <li>Tim Fishmap AI tidak akan pernah meminta kode verifikasi via telepon</li>
                </ul>
              </div>
              
              <div class="footer">
                <p>Email ini dikirim secara otomatis, mohon tidak membalas.</p>
                <p>&copy; 2025 Fishmap AI. Semua hak dilindungi.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log('📤 Sending email...');
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📨 Accepted:', result.accepted);
    
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    
    // Detailed error logging
    if (error.code === 'EAUTH') {
      console.error('🔐 Authentication failed - check EMAIL_USER and EMAIL_PASS');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 Network error - check internet connection');
    } else if (error.responseCode === 550) {
      console.error('📧 Invalid email address:', email);
    }
    
    throw error;
  }
};

// Kirim welcome email setelah verifikasi berhasil
export const sendWelcomeEmail = async (email, name) => {
  try {
    console.log('🎉 Sending welcome email to:', email);
    
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'Fishmap AI',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🎉 Selamat Datang di Fishmap AI!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .container {
              max-width: 600px;
              margin: 0 auto;
              font-family: Arial, sans-serif;
              background-color: #f8f9fa;
              padding: 20px;
            }
            .card {
              background: white;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #4a90e2;
              margin-bottom: 10px;
            }
            .welcome-banner {
              background: linear-gradient(135deg, #4a90e2, #357abd);
              color: white;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .feature-list {
              margin: 20px 0;
            }
            .feature-item {
              display: flex;
              align-items: center;
              margin: 10px 0;
              padding: 10px;
              background: #f8f9fa;
              border-radius: 5px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">🐟 Fishmap AI</div>
              </div>
              
              <div class="welcome-banner">
                <h2>Selamat Datang, ${name}! 🎉</h2>
                <p>Akun Anda telah berhasil diverifikasi</p>
              </div>
              
              <p>Halo <strong>${name}</strong>,</p>
              
              <p>Selamat! Email Anda telah berhasil diverifikasi dan akun Fishmap AI Anda sudah aktif. Sekarang Anda dapat menikmati semua fitur yang tersedia:</p>
              
              <div class="feature-list">
                <div class="feature-item">
                  <span style="margin-right: 10px;">📸</span>
                  <span>Scan dan identifikasi ikan dengan AI</span>
                </div>
                <div class="feature-item">
                  <span style="margin-right: 10px;">📚</span>
                  <span>Buat katalog ikan pribadi Anda</span>
                </div>
                <div class="feature-item">
                  <span style="margin-right: 10px;">🌊</span>
                  <span>Akses informasi cuaca dan kondisi laut</span>
                </div>
                <div class="feature-item">
                  <span style="margin-right: 10px;">📊</span>
                  <span>Analisis hasil tangkapan Anda</span>
                </div>
              </div>
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3000/login" 
                   style="background: #4a90e2; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Login Sekarang
                </a>
              </p>
              
              <p>Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi tim support kami.</p>
              
              <div class="footer">
                <p>Terima kasih telah bergabung dengan Fishmap AI!</p>
                <p>&copy; 2025 Fishmap AI. Semua hak dilindungi.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    throw error;
  }
};

// Kirim email notifikasi saat request katalog sedang ditinjau
export const sendCatalogReviewEmail = async (email, name) => {
  try {
    console.log('⏳ Sending catalog review notification email to:', email);
    
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'Fishmap AI Admin',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '⏳ Request Katalog Anda Sedang Ditinjau - Fishmap AI',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .container {
              max-width: 600px;
              margin: 0 auto;
              font-family: Arial, sans-serif;
              background-color: #f8f9fa;
              padding: 20px;
            }
            .card {
              background: white;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #4a90e2;
              margin-bottom: 10px;
            }
            .status-banner {
              background: linear-gradient(135deg, #ffa726, #ff9800);
              color: white;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .info-box {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
            .timeline {
              margin: 20px 0;
            }
            .timeline-item {
              display: flex;
              align-items: center;
              margin: 15px 0;
              padding: 10px;
              background: #f8f9fa;
              border-radius: 5px;
            }
            .timeline-icon {
              width: 30px;
              height: 30px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 15px;
              font-size: 14px;
            }
            .completed {
              background: #28a745;
              color: white;
            }
            .current {
              background: #ffa726;
              color: white;
            }
            .pending {
              background: #dee2e6;
              color: #6c757d;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">🐟 Fishmap AI</div>
              </div>
              
              <div class="status-banner">
                <h2>⏳ Request Katalog Sedang Ditinjau</h2>
                <p>Tim admin kami sedang memeriksa permintaan Anda</p>
              </div>
              
              <p>Halo <strong>${name}</strong>,</p>
              
              <p>Terima kasih telah mengajukan request akses katalog ikan. Kami telah menerima permintaan Anda dan saat ini sedang dalam proses peninjauan oleh tim admin kami.</p>
              
              <div class="info-box">
                <strong>📋 Status Saat Ini:</strong> Sedang Ditinjau<br>
                <strong>⏰ Estimasi Waktu:</strong> 1-3 hari kerja<br>
                <strong>📧 Notifikasi:</strong> Anda akan mendapat email saat proses selesai
              </div>
              
              <h3>📍 Progress Permintaan Anda:</h3>
              <div class="timeline">
                <div class="timeline-item">
                  <div class="timeline-icon completed">✓</div>
                  <div>
                    <strong>Request Dikirim</strong><br>
                    <small>Permintaan berhasil diterima sistem</small>
                  </div>
                </div>
                <div class="timeline-item">
                  <div class="timeline-icon current">⏳</div>
                  <div>
                    <strong>Sedang Ditinjau</strong><br>
                    <small>Tim admin sedang memeriksa kelengkapan data</small>
                  </div>
                </div>
                <div class="timeline-item">
                  <div class="timeline-icon pending">⭕</div>
                  <div>
                    <strong>Hasil Review</strong><br>
                    <small>Menunggu keputusan dari tim admin</small>
                  </div>
                </div>
              </div>
              
              <div style="background: #e3f2fd; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #1976d2;">💡 Yang Perlu Anda Ketahui:</h4>
                <ul style="margin-bottom: 0;">
                  <li>Proses review dilakukan secara manual untuk memastikan kualitas</li>
                  <li>Jika ada data yang kurang lengkap, tim kami akan menghubungi Anda</li>
                  <li>Setelah disetujui, Anda dapat langsung berkontribusi ke katalog</li>
                </ul>
              </div>
              
              <p>Kami akan segera mengirimkan email notifikasi setelah proses review selesai. Terima kasih atas kesabaran Anda!</p>
              
              <div class="footer">
                <p>Jika ada pertanyaan, hubungi kami di support@fishmap.ai</p>
                <p>&copy; 2025 Fishmap AI. Semua hak dilindungi.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Catalog review email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('❌ Error sending catalog review email:', error);
    throw error;
  }
};

// Kirim email notifikasi saat request katalog diterima
export const sendCatalogApprovedEmail = async (email, name) => {
  try {
    console.log('✅ Sending catalog approval email to:', email);
    
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'Fishmap AI Admin',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🎉 Request Katalog Disetujui - Selamat Datang Kontributor!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .container {
              max-width: 600px;
              margin: 0 auto;
              font-family: Arial, sans-serif;
              background-color: #f8f9fa;
              padding: 20px;
            }
            .card {
              background: white;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #4a90e2;
              margin-bottom: 10px;
            }
            .success-banner {
              background: linear-gradient(135deg, #28a745, #20c997);
              color: white;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .access-info {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
            .feature-list {
              margin: 20px 0;
            }
            .feature-item {
              display: flex;
              align-items: center;
              margin: 10px 0;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
              border-left: 4px solid #28a745;
            }
            .cta-button {
              background: #28a745;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              display: inline-block;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">🐟 Fishmap AI</div>
              </div>
              
              <div class="success-banner">
                <h2>🎉 Selamat! Request Anda Disetujui</h2>
                <p>Anda kini resmi menjadi Kontributor Katalog Fishmap AI</p>
              </div>
              
              <p>Halo <strong>${name}</strong>,</p>
              
              <p>Kabar baik! Tim admin kami telah menyetujui request akses katalog Anda. Selamat datang di komunitas kontributor Fishmap AI! 🎊</p>
              
              <div class="access-info">
                <strong>✅ Status Akun:</strong> Kontributor Katalog Aktif<br>
                <strong>📅 Disetujui pada:</strong> ${new Date().toLocaleDateString('id-ID')}<br>
                <strong>🔑 Akses:</strong> Tersedia langsung sekarang
              </div>
              
              <h3>🚀 Apa yang Bisa Anda Lakukan Sekarang:</h3>
              <div class="feature-list">
                <div class="feature-item">
                  <span style="margin-right: 15px; font-size: 20px;">📝</span>
                  <div>
                    <strong>Tambah Data Ikan Baru</strong><br>
                    <small>Kontribusi pengetahuan tentang spesies ikan</small>
                  </div>
                </div>
                <div class="feature-item">
                  <span style="margin-right: 15px; font-size: 20px;">📸</span>
                  <div>
                    <strong>Upload Foto Berkualitas</strong><br>
                    <small>Bantu perkaya database visual ikan</small>
                  </div>
                </div>
                <div class="feature-item">
                  <span style="margin-right: 15px; font-size: 20px;">🔍</span>
                  <div>
                    <strong>Verifikasi Data Eksisting</strong><br>
                    <small>Bantu validasi informasi yang sudah ada</small>
                  </div>
                </div>
                <div class="feature-item">
                  <span style="margin-right: 15px; font-size: 20px;">🏆</span>
                  <div>
                    <strong>Dapatkan Poin Kontribusi</strong><br>
                    <small>Raih badge dan pengakuan komunitas</small>
                  </div>
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="http://localhost:3000/katalog" class="cta-button">
                  🚀 Mulai Berkontribusi Sekarang
                </a>
              </div>
              
              <div style="background: #fff3cd; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #856404;">📋 Panduan Kontributor:</h4>
                <ul style="margin-bottom: 0; color: #856404;">
                  <li>Pastikan data yang diupload akurat dan terverifikasi</li>
                  <li>Gunakan foto dengan kualitas baik dan pencahayaan cukup</li>
                  <li>Ikuti panduan komunitas yang tersedia di platform</li>
                  <li>Jaga etika dan saling menghormati antar kontributor</li>
                </ul>
              </div>
              
              <p>Terima kasih telah bergabung dengan misi kami untuk membangun database ikan terlengkap di Indonesia. Kontribusi Anda sangat berharga bagi komunitas nelayan dan peneliti ikan!</p>
              
              <div class="footer">
                <p>Butuh bantuan? Hubungi kami di support@fishmap.ai</p>
                <p>&copy; 2025 Fishmap AI. Semua hak dilindungi.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Catalog approval email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('❌ Error sending catalog approval email:', error);
    throw error;
  }
};

// Kirim email notifikasi saat request katalog ditolak
export const sendCatalogRejectedEmail = async (email, name, reason = '') => {
  try {
    console.log('❌ Sending catalog rejection email to:', email);
    
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'Fishmap AI Admin',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '❌ Request Katalog Tidak Disetujui - Fishmap AI',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .container {
              max-width: 600px;
              margin: 0 auto;
              font-family: Arial, sans-serif;
              background-color: #f8f9fa;
              padding: 20px;
            }
            .card {
              background: white;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #4a90e2;
              margin-bottom: 10px;
            }
            .rejection-banner {
              background: linear-gradient(135deg, #dc3545, #c82333);
              color: white;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .reason-box {
              background: #f8d7da;
              border: 1px solid #f5c6cb;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
              color: #721c24;
            }
            .next-steps {
              background: #d1ecf1;
              border: 1px solid #bee5eb;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
              color: #0c5460;
            }
            .cta-button {
              background: #007bff;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              display: inline-block;
              margin: 15px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">🐟 Fishmap AI</div>
              </div>
              
              <div class="rejection-banner">
                <h2>❌ Request Tidak Disetujui</h2>
                <p>Maaf, permintaan akses katalog Anda belum dapat kami setujui</p>
              </div>
              
              <p>Halo <strong>${name}</strong>,</p>
              
              <p>Terima kasih telah mengajukan request akses katalog ikan. Setelah melalui proses review, kami belum dapat menyetujui permintaan Anda saat ini.</p>
              
              ${reason ? `
              <div class="reason-box">
                <strong>📝 Alasan Penolakan:</strong><br>
                ${reason}
              </div>
              ` : ''}
              
              <div class="next-steps">
                <strong>🔄 Langkah Selanjutnya:</strong><br>
                • Perbaiki dokumen atau data yang diminta<br>
                • Pastikan semua persyaratan telah dipenuhi<br>
                • Ajukan request ulang setelah melakukan perbaikan<br>
                • Hubungi support jika butuh klarifikasi lebih lanjut
              </div>
              
              <p>Jangan berkecil hati! Anda masih dapat mengajukan request kembali setelah melakukan perbaikan yang diperlukan. Tim kami siap membantu Anda melalui proses ini.</p>
              
              <div style="text-align: center;">
                <a href="http://localhost:3000/katalog/daftar" class="cta-button">
                  🔄 Ajukan Request Ulang
                </a>
              </div>
              
              <div style="background: #fff3cd; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #856404;">💡 Tips untuk Request Berikutnya:</h4>
                <ul style="margin-bottom: 0; color: #856404;">
                  <li>Pastikan semua dokumen terisi dengan lengkap dan jelas</li>
                  <li>Gunakan foto ID yang tajam dan mudah dibaca</li>
                  <li>Berikan alasan yang detail mengapa ingin menjadi kontributor</li>
                  <li>Tunjukkan pengalaman atau pengetahuan tentang ikan</li>
                </ul>
              </div>
              
              <p>Jika Anda memiliki pertanyaan atau butuh klarifikasi lebih lanjut, jangan ragu untuk menghubungi tim support kami.</p>
              
              <div class="footer">
                <p>Butuh bantuan? Hubungi kami di support@fishmap.ai</p>
                <p>&copy; 2025 Fishmap AI. Semua hak dilindungi.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Catalog rejection email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('❌ Error sending catalog rejection email:', error);
    throw error;
  }
};