import { Sequelize } from 'sequelize';
import db from '../config/Database.js';
import Users from './userModel.js';

const { DataTypes } = Sequelize;

const FishPredictions = db.define('katalog_fish', { // Catatan: Ganti nama tabel jika tidak mau pakai 'katalog_fish'
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Users,
      key: 'id'
    }
  },
  predictedFishName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  probability: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  habitat: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  consumptionSafety: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fishImage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  predictionDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  predictionTime: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  boxes: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  freezeTableName: true,
  timestamps: true
});

FishPredictions.belongsTo(Users, {
  foreignKey: 'userId',
  as: 'user'
});

export default FishPredictions;