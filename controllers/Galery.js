import Galery from '../models/galeryModels.js';
import { Op } from 'sequelize';

// Get all galery
export const getAllGalery = async (req, res) => {
    try {
        const { page = 1, limit = 100, search = '' } = req.query;
        const offset = (page - 1) * limit;

        let galeryData;

        if (search) {
            galeryData = await Galery.searchGalery(search, {
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            
            const totalCount = await Galery.count({
                where: {
                    [Op.or]: [
                        { nama: { [Op.like]: `%${search}%` } },
                        { deskripsi: { [Op.like]: `%${search}%` } }
                    ]
                }
            });

            return res.status(200).json({
                msg: "Data galeri berhasil diambil",
                data: galeryData,
                pagination: {
                    total_items: totalCount,
                    current_page: parseInt(page),
                    items_per_page: parseInt(limit)
                }
            });
        }

        galeryData = await Galery.findAndCountAll({
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.status(200).json({
            msg: "Data galeri berhasil diambil",
            data: galeryData.rows,
            pagination: {
                total_items: galeryData.count,
                current_page: parseInt(page),
                items_per_page: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error fetching galery:', error);
        res.status(500).json({ msg: "Server error" });
    }
};

// Get galery by ID
export const getGaleryById = async (req, res) => {
    try {
        const { id } = req.params;
        const galery = await Galery.findByPk(id);

        if (!galery) {
            return res.status(404).json({ msg: "Data galeri tidak ditemukan" });
        }

        res.status(200).json({
            msg: "Data galeri berhasil diambil",
            data: galery
        });

    } catch (error) {
        console.error('Error fetching galery by ID:', error);
        res.status(500).json({ msg: "Server error" });
    }
};

// Create new galery
export const createGalery = async (req, res) => {
    try {
        const { nama, gambar, deskripsi } = req.body;

        // Validasi input wajib
        if (!nama || !gambar || !deskripsi) {
            return res.status(400).json({
                msg: "Nama, gambar, dan deskripsi wajib diisi"
            });
        }

        // Validasi ukuran base64 (approximate check)
        if (gambar.length > 16777215) { // MySQL LONGTEXT limit
            return res.status(413).json({
                msg: "Ukuran gambar terlalu besar untuk disimpan di database"
            });
        }

        // Validasi format base64
        if (gambar.startsWith('data:image/')) {
            const base64Data = gambar.split(',')[1];
            if (!base64Data) {
                return res.status(400).json({
                    msg: "Format gambar base64 tidak valid"
                });
            }
        }
        
        // Create galery
        const newGalery = await Galery.create({
            nama: nama.trim(),
            gambar,
            deskripsi: deskripsi.trim()
        });

        res.status(201).json({
            msg: "Galeri berhasil ditambahkan",
            data: newGalery
        });

    } catch (error) {
        console.error('Error creating galery:', error);

        if (error.name === "SequelizeValidationError") {
            return res.status(400).json({
                msg: "Data tidak valid",
                errors: error.errors.map(e => ({
                    field: e.path,
                    message: e.message
                }))
            });
        }

        if (error.name === "SequelizeDatabaseError") {
            if (error.original?.code === 'ER_DATA_TOO_LONG') {
                return res.status(413).json({
                    msg: "Data terlalu besar untuk disimpan"
                });
            }
        }

        res.status(500).json({ msg: "Server error" });
    }
};

// Update galery
export const updateGalery = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama, gambar, deskripsi } = req.body;

        const galery = await Galery.findByPk(id);

        if (!galery) {
            return res.status(404).json({ msg: "Data galeri tidak ditemukan" });
        }

        // Build update object
        const updateData = {};
        if (nama !== undefined) updateData.nama = nama.trim();
        if (gambar !== undefined) {
            // Validasi ukuran base64
            if (gambar.length > 16777215) {
                return res.status(413).json({
                    msg: "Ukuran gambar terlalu besar untuk disimpan di database"
                });
            }
            updateData.gambar = gambar;
        }
        if (deskripsi !== undefined) updateData.deskripsi = deskripsi.trim();

        // Update galery
        await galery.update(updateData);

        res.status(200).json({
            msg: "Galeri berhasil diperbarui",
            data: galery
        });

    } catch (error) {
        console.error('Error updating galery:', error);

        if (error.name === "SequelizeValidationError") {
            return res.status(400).json({
                msg: "Data tidak valid",
                errors: error.errors.map(e => ({
                    field: e.path,
                    message: e.message
                }))
            });
        }

        if (error.name === "SequelizeDatabaseError") {
            if (error.original?.code === 'ER_DATA_TOO_LONG') {
                return res.status(413).json({
                    msg: "Data terlalu besar untuk disimpan"
                });
            }
        }

        res.status(500).json({ msg: "Server error" });
    }
};

// Delete galery
export const deleteGalery = async (req, res) => {
    try {
        const { id } = req.params;

        const galery = await Galery.findByPk(id);

        if (!galery) {
            return res.status(404).json({ msg: "Data galeri tidak ditemukan" });
        }

        await galery.destroy();

        res.status(200).json({
            msg: "Galeri berhasil dihapus"
        });

    } catch (error) {
        console.error('Error deleting galery:', error);
        res.status(500).json({ msg: "Server error" });
    }
};