import Recipes from "../models/recipeModel.js";

// Ambil semua resep
export const getAllRecipes = async (req, res) => {
  try {
    const recipes = await Recipes.findAll();
    res.status(200).json(recipes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Ambil resep berdasarkan nama ikan
export const getRecipeByFish = async (req, res) => {
  try {
    const { fish_name } = req.params;
    const recipe = await Recipes.findOne({ where: { fish_name } });

    if (!recipe) return res.status(404).json({ message: "Resep tidak ditemukan" });

    res.status(200).json(recipe);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tambah resep baru
export const createRecipe = async (req, res) => {
  try {
    const { fish_name, title, image_url, ingredients, instructions } = req.body;
    const newRecipe = await Recipes.create({
      fish_name,
      title,
      image_url,
      ingredients,
      instructions
    });
    res.status(201).json(newRecipe);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update resep
export const updateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await Recipes.findByPk(id);
    if (!recipe) return res.status(404).json({ message: "Resep tidak ditemukan" });

    await recipe.update(req.body);
    res.status(200).json(recipe);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hapus resep
export const deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await Recipes.findByPk(id);
    if (!recipe) return res.status(404).json({ message: "Resep tidak ditemukan" });

    await recipe.destroy();
    res.status(200).json({ message: "Resep berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add this new function to Recipe.js controller

// Get recipes with flexible fish name matching
// Add this new function to Recipe.js controller

// Add this route to index.js (after existing recipe routes):
// router.get('/api/recipes/search/:fishName', getRecipesByFishNameFlexible);

// Get recipes with flexible fish name matching
export const getRecipesByFishNameFlexible = async (req, res) => {
    try {
        const { fishName } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Clean and normalize fish name for better matching
        const cleanFishName = fishName.trim().toLowerCase();
        
        // Try exact match first
        let recipesData = await Recipes.findAndCountAll({
            where: {
                fish_name: { [Op.like]: `%${fishName}%` }
            },
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // If no exact match, try partial match with common variations
        if (recipesData.count === 0) {
            // Common fish name variations mapping
            const fishVariations = {
                'mujair': ['nila', 'tilapia', 'mujair'],
                'nila': ['mujair', 'tilapia', 'nila'],
                'lele': ['catfish', 'lele'],
                'gurame': ['gourami', 'gurami', 'gurame'],
                'bandeng': ['milkfish', 'bandeng'],
                'patin': ['pangasius', 'patin'],
                'mas': ['carp', 'mas', 'karper'],
                'bawal': ['pomfret', 'bawal'],
                'kakap': ['snapper', 'kakap'],
                'tuna': ['skipjack', 'tuna'],
                'cakalang': ['skipjack', 'cakalang', 'tuna']
            };

            // Get variations for the fish name
            let searchTerms = [cleanFishName];
            for (const [key, variations] of Object.entries(fishVariations)) {
                if (cleanFishName.includes(key) || variations.some(v => cleanFishName.includes(v))) {
                    searchTerms = [...new Set([...searchTerms, ...variations])];
                    break;
                }
            }

            // Build OR condition for multiple search terms
            const orConditions = searchTerms.map(term => ({
                fish_name: { [Op.like]: `%${term}%` }
            }));

            recipesData = await Recipes.findAndCountAll({
                where: {
                    [Op.or]: orConditions
                },
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
        }

        // If still no results, return empty with suggestion
        if (recipesData.count === 0) {
            return res.status(200).json({ 
                msg: `Belum ada resep untuk ${fishName}`,
                data: [],
                suggestion: 'Coba kata kunci lain atau lihat resep ikan lainnya',
                pagination: {
                    total_items: 0,
                    current_page: parseInt(page),
                    items_per_page: parseInt(limit),
                    total_pages: 0
                }
            });
        }

        res.status(200).json({
            msg: `Ditemukan ${recipesData.count} resep untuk ${fishName}`,
            data: recipesData.rows,
            pagination: {
                total_items: recipesData.count,
                current_page: parseInt(page),
                items_per_page: parseInt(limit),
                total_pages: Math.ceil(recipesData.count / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching recipes by fish name:', error);
        res.status(500).json({ msg: "Server error" });
    }
};