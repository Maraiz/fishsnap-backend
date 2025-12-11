import { Sequelize } from "sequelize";
import db from "../config/Database.js";

const { DataTypes } = Sequelize;

const Budidaya = db.define("budidaya", {
  fish_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Nama ikan yang dibudidayakan (contoh: Nila, Lele, Gurami)"
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: "Deskripsi umum tentang budidaya ikan tersebut"
  },
  requirements: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: "Kebutuhan dasar budidaya seperti pH, suhu, jenis kolam, pakan, dll"
  },
  steps: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: "Langkah-langkah atau cara melakukan budidaya ikan tersebut"
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Gambar ilustrasi budidaya ikan (opsional)"
  }
}, {
  freezeTableName: true
});

export default Budidaya;
