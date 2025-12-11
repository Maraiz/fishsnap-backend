// models/dataIkanModel.js
import { Sequelize } from 'sequelize';
import db from '../config/Database.js';
import Users from './userModel.js';

const { DataTypes } = Sequelize;

const DataIkan = db.define('data_ikan', {
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
  namaIkan: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nama ikan hasil prediksi atau input user'
  },
  predictedClass: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Kelas ikan hasil prediksi AI'
  },
  probability: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Probabilitas prediksi (0-1)'
  },
  habitat: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Habitat ikan'
  },
  konsumsi: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Apakah ikan dapat dikonsumsi'
  },
  fishImage: {
    type: DataTypes.TEXT, // base64 string atau URL
    allowNull: true,
    comment: 'Gambar ikan hasil scan'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Catatan tambahan (misalnya top 3 prediksi)'
  }
}, {
  freezeTableName: true, // nama tabel tetap "data_ikan"
  timestamps: true       // Sequelize tambahkan createdAt & updatedAt
});

// Relasi ke user
DataIkan.belongsTo(Users, { 
  foreignKey: 'userId',
  as: 'user'
});

export default DataIkan;
