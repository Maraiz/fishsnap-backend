import { Sequelize } from "sequelize";
import db from "../config/Database.js";

const { DataTypes } = Sequelize;

const Galery = db.define("galery", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nama: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: {
        args: [1, 100], // Minimum 1 karakter, maksimum 100
        msg: "Nama gambar harus 1-100 karakter"
      },
      notEmpty: {
        msg: "Nama gambar tidak boleh kosong"
      }
    }
  },
  gambar: {
    type: DataTypes.TEXT('long'), // Ubah dari TEXT ke TEXT('long') untuk base64 besar
    allowNull: false,
    validate: {
      notEmpty: {
        msg: "Gambar harus dipilih"
      },
      // Tambahkan validasi ukuran base64
      len: {
        args: [1, 16777215], // Max untuk LONGTEXT MySQL (16MB)
        msg: "Ukuran gambar terlalu besar"
      }
    },
    comment: 'Base64 encoded image atau URL path gambar'
  },
  deskripsi: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: {
        args: [1, 1000], // Minimum 1 karakter, maksimum 1000
        msg: "Deskripsi harus 1-1000 karakter"
      },
      notEmpty: {
        msg: "Deskripsi tidak boleh kosong"
      }
    }
  }
}, {
  freezeTableName: true,
  timestamps: true
});

// Static Methods untuk query
Galery.getAllActive = function(options = {}) {
  return this.findAll({
    order: [['createdAt', 'DESC']],
    ...options
  });
};

Galery.searchGalery = function(searchTerm, options = {}) {
  const { Op } = Sequelize;
  
  return this.findAll({
    where: {
      [Op.or]: [
        {
          nama: {
            [Op.like]: `%${searchTerm}%`
          }
        },
        {
          deskripsi: {
            [Op.like]: `%${searchTerm}%`
          }
        }
      ]
    },
    order: [['createdAt', 'DESC']],
    ...options
  });
};

export default Galery;