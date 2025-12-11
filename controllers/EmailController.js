// controllers/EmailController.js
import { 
  testEmailConnection as testConnection,
  sendCatalogReviewEmail as sendReviewEmail,
  sendCatalogApprovedEmail as sendApprovedEmail,
  sendCatalogRejectedEmail as sendRejectedEmail
} from '../services/emailService.js';
import Users from '../models/userModel.js';

// Test email connection
export const testEmailConnection = async (req, res) => {
  try {
    console.log('🧪 Testing email connection...');
    
    const result = await testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        msg: 'Email service connection successful',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        msg: 'Email service connection failed',
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error testing email connection:', error);
    res.status(500).json({
      success: false,
      msg: 'Error testing email connection',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Send catalog review email (when user submits request)
export const sendCatalogReviewEmail = async (req, res) => {
  try {
    const userId = req.userId; // From verifyToken middleware
    let { email, name } = req.body;

    // If email/name not provided, get from user database
    if (!email || !name) {
      const user = await Users.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          msg: 'User tidak ditemukan'
        });
      }
      email = email || user.email;
      name = name || user.name;
    }

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        msg: 'Email dan nama harus diisi'
      });
    }

    console.log('📧 Sending catalog review email to:', email);

    const result = await sendReviewEmail(email, name);

    if (result.success) {
      res.json({
        success: true,
        msg: 'Email notifikasi review berhasil dikirim',
        messageId: result.messageId,
        recipient: {
          email,
          name
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        msg: 'Gagal mengirim email notifikasi review'
      });
    }

  } catch (error) {
    console.error('❌ Error sending catalog review email:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error saat mengirim email review',
      error: error.message
    });
  }
};

// Send catalog approved email (admin function)
export const sendCatalogApprovedEmailController = async (req, res) => {
  try {
    const { userId, email, name } = req.body;

    // Validate input
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        msg: 'Email dan nama harus diisi'
      });
    }

    console.log('✅ Sending catalog approval email to:', email);

    const result = await sendApprovedEmail(email, name);

    if (result.success) {
      // Optional: Update user status in database here if needed
      if (userId) {
        try {
          await Users.update(
            { catalogAccess: 'approved' }, 
            { where: { id: userId } }
          );
          console.log('✅ User catalog access status updated to approved');
        } catch (dbError) {
          console.log('⚠️ Warning: Could not update user status in database');
        }
      }

      res.json({
        success: true,
        msg: 'Email approval berhasil dikirim',
        messageId: result.messageId,
        recipient: {
          email,
          name,
          userId
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        msg: 'Gagal mengirim email approval'
      });
    }

  } catch (error) {
    console.error('❌ Error sending catalog approval email:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error saat mengirim email approval',
      error: error.message
    });
  }
};

// Send catalog rejected email (admin function)
export const sendCatalogRejectedEmailController = async (req, res) => {
  try {
    const { userId, email, name, reason } = req.body;

    // Validate input
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        msg: 'Email dan nama harus diisi'
      });
    }

    console.log('❌ Sending catalog rejection email to:', email);

    const result = await sendRejectedEmail(email, name, reason);

    if (result.success) {
      // Optional: Update user status in database here if needed
      if (userId) {
        try {
          await Users.update(
            { 
              catalogAccess: 'rejected',
              catalogRejectionReason: reason || 'Tidak memenuhi persyaratan'
            }, 
            { where: { id: userId } }
          );
          console.log('✅ User catalog access status updated to rejected');
        } catch (dbError) {
          console.log('⚠️ Warning: Could not update user status in database');
        }
      }

      res.json({
        success: true,
        msg: 'Email rejection berhasil dikirim',
        messageId: result.messageId,
        recipient: {
          email,
          name,
          userId
        },
        reason: reason || 'Tidak memenuhi persyaratan',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        msg: 'Gagal mengirim email rejection'
      });
    }

  } catch (error) {
    console.error('❌ Error sending catalog rejection email:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error saat mengirim email rejection',
      error: error.message
    });
  }
};

// Test email sending (for development)
export const testEmailSending = async (req, res) => {
  try {
    const { type, email, name, reason } = req.body;

    if (!type || !email || !name) {
      return res.status(400).json({
        success: false,
        msg: 'Type, email, dan nama harus diisi'
      });
    }

    console.log(`🧪 Testing ${type} email to:`, email);

    let result;

    switch (type) {
      case 'review':
        result = await sendReviewEmail(email, name);
        break;
      case 'approved':
        result = await sendApprovedEmail(email, name);
        break;
      case 'rejected':
        result = await sendRejectedEmail(email, name, reason);
        break;
      default:
        return res.status(400).json({
          success: false,
          msg: 'Type harus salah satu dari: review, approved, rejected'
        });
    }

    if (result.success) {
      res.json({
        success: true,
        msg: `Test email ${type} berhasil dikirim ke ${email}`,
        messageId: result.messageId,
        type,
        recipient: {
          email,
          name
        },
        reason: reason || null,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        msg: `Gagal mengirim test email ${type}`
      });
    }

  } catch (error) {
    console.error('❌ Error sending test email:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error saat mengirim test email',
      error: error.message
    });
  }
};

// Get email statistics (optional - for admin dashboard)
export const getEmailStatistics = async (req, res) => {
  try {
    // This would require email logging in database
    // For now, return basic stats
    res.json({
      success: true,
      data: {
        totalEmailsSent: 0, // Implement tracking if needed
        reviewEmails: 0,
        approvalEmails: 0,
        rejectionEmails: 0,
        lastEmailSent: null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting email statistics:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error saat mengambil statistik email',
      error: error.message
    });
  }
};