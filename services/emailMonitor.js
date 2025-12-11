// services/emailMonitor.js - Email Usage Monitoring
import fs from 'fs/promises';
import path from 'path';

class EmailMonitor {
  constructor() {
    this.logFile = path.join(process.cwd(), 'logs', 'email-usage.json');
    this.dailyLimit = 500; // Gmail daily limit
    this.hourlyLimit = 100; // Safe hourly limit
    this.init();
  }

  async init() {
    // Create logs directory if not exists
    const logsDir = path.dirname(this.logFile);
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  // Get current usage stats
  async getUsageStats() {
    try {
      const data = await fs.readFile(this.logFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist, return empty stats
      return this.createEmptyStats();
    }
  }

  // Create empty stats structure
  createEmptyStats() {
    const now = new Date();
    return {
      date: now.toDateString(),
      hour: now.getHours(),
      daily: {
        total: 0,
        otp: 0,
        welcome: 0,
        catalogReview: 0,
        catalogApproved: 0,
        catalogRejected: 0,
        lastReset: now.toISOString()
      },
      hourly: {
        total: 0,
        lastReset: now.toISOString()
      },
      history: []
    };
  }

  // Check and reset counters if needed
  async resetCountersIfNeeded(stats) {
    const now = new Date();
    const currentDate = now.toDateString();
    const currentHour = now.getHours();
    
    // Reset daily counter if new day
    if (stats.date !== currentDate) {
      console.log('📅 New day detected, resetting daily email counter');
      
      // Save yesterday's stats to history
      stats.history.push({
        date: stats.date,
        total: stats.daily.total,
        breakdown: { ...stats.daily }
      });
      
      // Keep only last 30 days of history
      if (stats.history.length > 30) {
        stats.history = stats.history.slice(-30);
      }
      
      stats.date = currentDate;
      stats.daily = {
        total: 0,
        otp: 0,
        welcome: 0,
        catalogReview: 0,
        catalogApproved: 0,
        catalogRejected: 0,
        lastReset: now.toISOString()
      };
    }
    
    // Reset hourly counter if new hour
    if (stats.hour !== currentHour) {
      console.log('🕐 New hour detected, resetting hourly email counter');
      stats.hour = currentHour;
      stats.hourly = {
        total: 0,
        lastReset: now.toISOString()
      };
    }
    
    return stats;
  }

  // Check if we can send email (rate limiting)
  async canSendEmail() {
    const stats = await this.getUsageStats();
    const updatedStats = await this.resetCountersIfNeeded(stats);
    
    const dailyUsed = updatedStats.daily.total;
    const hourlyUsed = updatedStats.hourly.total;
    
    // Check limits
    if (dailyUsed >= this.dailyLimit) {
      return {
        canSend: false,
        reason: 'Daily limit exceeded',
        dailyUsed,
        dailyLimit: this.dailyLimit,
        resetTime: 'tomorrow'
      };
    }
    
    if (hourlyUsed >= this.hourlyLimit) {
      return {
        canSend: false,
        reason: 'Hourly limit exceeded',
        hourlyUsed,
        hourlyLimit: this.hourlyLimit,
        resetTime: 'next hour'
      };
    }
    
    return {
      canSend: true,
      dailyUsed,
      dailyLimit: this.dailyLimit,
      hourlyUsed,
      hourlyLimit: this.hourlyLimit
    };
  }

  // Record email sent
  async recordEmailSent(emailType) {
    const stats = await this.getUsageStats();
    const updatedStats = await this.resetCountersIfNeeded(stats);
    
    // Increment counters
    updatedStats.daily.total++;
    updatedStats.hourly.total++;
    
    // Increment specific email type counter
    if (updatedStats.daily[emailType] !== undefined) {
      updatedStats.daily[emailType]++;
    }
    
    // Save updated stats
    await fs.writeFile(this.logFile, JSON.stringify(updatedStats, null, 2));
    
    // Log current usage
    console.log(`📧 Email sent (${emailType}):`, {
      daily: `${updatedStats.daily.total}/${this.dailyLimit}`,
      hourly: `${updatedStats.hourly.total}/${this.hourlyLimit}`
    });
    
    // Warn if approaching limits
    if (updatedStats.daily.total > this.dailyLimit * 0.8) {
      console.warn('⚠️ WARNING: Approaching daily email limit!');
    }
    
    if (updatedStats.hourly.total > this.hourlyLimit * 0.8) {
      console.warn('⚠️ WARNING: Approaching hourly email limit!');
    }
  }

  // Get usage summary
  async getUsageSummary() {
    const stats = await this.getUsageStats();
    const updatedStats = await this.resetCountersIfNeeded(stats);
    
    const dailyPercentage = ((updatedStats.daily.total / this.dailyLimit) * 100).toFixed(1);
    const hourlyPercentage = ((updatedStats.hourly.total / this.hourlyLimit) * 100).toFixed(1);
    
    return {
      today: {
        used: updatedStats.daily.total,
        limit: this.dailyLimit,
        percentage: dailyPercentage,
        remaining: this.dailyLimit - updatedStats.daily.total,
        breakdown: {
          otp: updatedStats.daily.otp,
          welcome: updatedStats.daily.welcome,
          catalogReview: updatedStats.daily.catalogReview,
          catalogApproved: updatedStats.daily.catalogApproved,
          catalogRejected: updatedStats.daily.catalogRejected
        }
      },
      thisHour: {
        used: updatedStats.hourly.total,
        limit: this.hourlyLimit,
        percentage: hourlyPercentage,
        remaining: this.hourlyLimit - updatedStats.hourly.total
      },
      history: updatedStats.history.slice(-7) // Last 7 days
    };
  }

  // Get email health status
  async getHealthStatus() {
    const summary = await this.getUsageSummary();
    
    let status = 'healthy';
    let alerts = [];
    
    // Check daily usage
    if (summary.today.percentage > 90) {
      status = 'critical';
      alerts.push('Daily limit almost reached!');
    } else if (summary.today.percentage > 70) {
      status = 'warning';
      alerts.push('High daily usage detected');
    }
    
    // Check hourly usage  
    if (summary.thisHour.percentage > 90) {
      status = 'critical';
      alerts.push('Hourly limit almost reached!');
    } else if (summary.thisHour.percentage > 70) {
      if (status !== 'critical') status = 'warning';
      alerts.push('High hourly usage detected');
    }
    
    return {
      status,
      alerts,
      summary,
      recommendations: this.getRecommendations(summary)
    };
  }

  // Get recommendations based on usage
  getRecommendations(summary) {
    const recommendations = [];
    
    if (summary.today.percentage > 50) {
      recommendations.push('Consider implementing email queue system');
      recommendations.push('Evaluate migrating to Mailgun or SendGrid');
    }
    
    if (summary.today.percentage > 80) {
      recommendations.push('⚠️ URGENT: Set up backup email service');
      recommendations.push('Implement user email preferences');
    }
    
    if (summary.thisHour.percentage > 70) {
      recommendations.push('Add delay between email sends');
      recommendations.push('Batch email sending for non-critical emails');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const emailMonitor = new EmailMonitor();