import { Sequelize } from "sequelize";
import db from "../config/Database.js";

const { DataTypes } = Sequelize;

const Admin = db.define("admins", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 50]
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [10, 15],
      is: /^[0-9]+$/i
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  gender: {
    type: DataTypes.ENUM("male", "female"),
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 100]
    }
  },
  
  // Role Admin sederhana
  role: {
    type: DataTypes.ENUM("super_admin", "admin"),
    allowNull: false,
    defaultValue: "admin"
  },
  
  // Permissions sederhana
  permissions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      manage_users: false,
      manage_admins: false,
      view_analytics: true
    }
  },
  
  // Status Admin
  status: {
    type: DataTypes.ENUM("active", "inactive", "suspended"),
    allowNull: false,
    defaultValue: "active"
  },
  
  // Session Management
  refresh_token: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Audit Trail
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  freezeTableName: true,
  
  hooks: {
    beforeCreate: (admin, options) => {
      if (options.adminId) {
        admin.created_by = options.adminId;
      }
      
      // Set default permissions berdasarkan role
      if (!admin.permissions) {
        admin.permissions = Admin.getDefaultPermissions(admin.role);
      }
    },
    beforeUpdate: (admin, options) => {
      if (options.adminId) {
        admin.updated_by = options.adminId;
      }
      
      if (admin.changed('refresh_token') && admin.refresh_token) {
        admin.last_login = new Date();
      }
    }
  }
});

// Instance Methods sederhana
Admin.prototype.canManageUsers = function() {
  return this.status === 'active' && 
         (this.role === 'super_admin' || 
          this.permissions?.manage_users === true);
};

Admin.prototype.canManageAdmins = function() {
  return this.status === 'active' && 
         (this.role === 'super_admin' || 
          this.permissions?.manage_admins === true);
};

// Static Methods
Admin.getDefaultPermissions = function(role) {
  const permissions = {
    super_admin: {
      manage_users: true,
      manage_admins: true,
      view_analytics: true
    },
    admin: {
      manage_users: false,
      manage_admins: false,
      view_analytics: true
    }
  };
  
  return permissions[role] || permissions.admin;
};

// Self-referencing associations
Admin.belongsTo(Admin, { 
  as: 'creator', 
  foreignKey: 'created_by',
  constraints: false 
});

Admin.belongsTo(Admin, { 
  as: 'updater', 
  foreignKey: 'updated_by',
  constraints: false 
});

export default Admin;