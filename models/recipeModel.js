import { Sequelize } from "sequelize";
import db from "../config/Database.js";

const { DataTypes } = Sequelize;

const Recipes = db.define("recipes", {
  fish_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Nama ikan yang digunakan dalam resep (contoh: Nila, Bandeng, Lele)"
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Judul resep masakan ikan"
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "URL atau path gambar hasil masakan"
  },
  ingredients: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: "Daftar bahan-bahan yang digunakan"
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: "Langkah-langkah atau cara memasak"
  }
}, {
  freezeTableName: true
});

export default Recipes;
