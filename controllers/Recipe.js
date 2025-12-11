import Recipes from "../models/recipeModel.js";
import { Op } from "sequelize";

// Ambil semua resep dengan pagination
export const getAllRecipes = async (req, res) => {
  try {
    const { page = 1, limit = 10, fish_name } = req.query;
    const offset = (page - 1) * limit;

    const whereCondition = fish_name 
      ? { fish_name: { [Op.like]: `%${fish_name}%` } }
      : {};

    const recipes = await Recipes.findAndCountAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      msg: "Berhasil mengambil data resep",
      data: recipes.rows,
      pagination: {
        total_items: recipes.count,
        current_page: parseInt(page),
        items_per_page: parseInt(limit),
        total_pages: Math.ceil(recipes.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Ambil resep berdasarkan ID
export const getRecipeById = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await Recipes.findByPk(id);

    if (!recipe) {
      return res.status(404).json({ message: "Resep tidak ditemukan" });
    }

    res.status(200).json({
      msg: "Berhasil mengambil detail resep",
      data: recipe
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Ambil resep berdasarkan nama ikan
export const getRecipesByFishName = async (req, res) => {
  try {
    const { fishName } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const recipes = await Recipes.findAndCountAll({
      where: {
        fish_name: { [Op.like]: `%${fishName}%` }
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    if (recipes.count === 0) {
      return res.status(200).json({
        msg: `Belum ada resep untuk ${fishName}`,
        data: [],
        pagination: {
          total_items: 0,
          current_page: parseInt(page),
          items_per_page: parseInt(limit),
          total_pages: 0
        }
      });
    }

    res.status(200).json({
      msg: `Ditemukan ${recipes.count} resep untuk ${fishName}`,
      data: recipes.rows,
      pagination: {
        total_items: recipes.count,
        current_page: parseInt(page),
        items_per_page: parseInt(limit),
        total_pages: Math.ceil(recipes.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tambah resep baru
export const createRecipe = async (req, res) => {
  try {
    const { fish_name, title, image_url, ingredients, instructions } = req.body;

    // Validasi input
    if (!fish_name || !title || !ingredients || !instructions) {
      return res.status(400).json({ 
        msg: "Semua field wajib diisi (fish_name, title, ingredients, instructions)" 
      });
    }

    const newRecipe = await Recipes.create({
      fish_name,
      title,
      image_url: image_url || null,
      ingredients,
      instructions
    });

    res.status(201).json({
      msg: "Resep berhasil ditambahkan",
      data: newRecipe
    });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ 
      msg: "Gagal menambahkan resep",
      error: error.message 
    });
  }
};

// Update resep
export const updateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await Recipes.findByPk(id);

    if (!recipe) {
      return res.status(404).json({ message: "Resep tidak ditemukan" });
    }

    const { fish_name, title, image_url, ingredients, instructions } = req.body;
    
    await recipe.update({
      fish_name: fish_name || recipe.fish_name,
      title: title || recipe.title,
      image_url: image_url !== undefined ? image_url : recipe.image_url,
      ingredients: ingredients || recipe.ingredients,
      instructions: instructions || recipe.instructions
    });

    res.status(200).json({
      msg: "Resep berhasil diperbarui",
      data: recipe
    });
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ 
      msg: "Gagal memperbarui resep",
      error: error.message 
    });
  }
};

// Hapus resep
export const deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await Recipes.findByPk(id);

    if (!recipe) {
      return res.status(404).json({ message: "Resep tidak ditemukan" });
    }

    await recipe.destroy();
    res.status(200).json({ 
      msg: "Resep berhasil dihapus",
      data: { id }
    });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ 
      msg: "Gagal menghapus resep",
      error: error.message 
    });
  }
};

// Ambil daftar nama ikan unik
export const getUniqueFishNames = async (req, res) => {
  try {
    const fishNames = await Recipes.findAll({
      attributes: [[Recipes.sequelize.fn('DISTINCT', Recipes.sequelize.col('fish_name')), 'fish_name']],
      raw: true,
      order: [['fish_name', 'ASC']]
    });

    const names = fishNames.map(item => item.fish_name);

    res.status(200).json({
      msg: "Berhasil mengambil daftar nama ikan",
      data: names
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};