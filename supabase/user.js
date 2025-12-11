// supabase/users.js
import { supabase } from '../config/Database.js';

// ===================================
// USER OPERATIONS (SUPABASE STYLE)
// ===================================

// 1. Cari user berdasarkan email
export const getUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  return { data, error };
};

// 2. Cari user berdasarkan ID
export const getUserById = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
};

// 3. Buat user baru
export const createUser = async (userData) => {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single();
  return { data, error };
};

// 4. Update user
export const updateUser = async (id, updates) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
};

// 5. Hapus user (opsional)
export const deleteUser = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);
  return { data, error };
};

// 6. Cek apakah user bisa akses katalog
export const canAccessCatalog = (user) => {
  return user && (user.role === 'contributor' || user.role === 'admin');
};

// 7. Cek apakah admin
export const isAdmin = (user) => {
  return user && user.role === 'admin';
};

// 8. Dapatkan semua yang bisa submit katalog
export const getContributors = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('role', ['contributor', 'admin']);
  return { data, error };
};

// 9. Dapatkan semua request katalog yang pending
export const getPendingCatalogRequests = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('catalog_request_status', 'pending')
    .order('catalog_request_date', { ascending: true });
  return { data, error };
};

// 10. Update status request katalog
export const updateCatalogRequestStatus = async (userId, status, adminId = null, reason = null) => {
  const updates = {
    catalog_request_status: status,
  };

  if (status === 'approved') {
    updates.catalog_approved_date = new Date().toISOString();
    updates.catalog_approved_by = adminId;
    updates.role = 'contributor'; // otomatis jadi contributor
  } else if (status === 'rejected') {
    updates.catalog_rejection_reason = reason;
  }

  return await updateUser(userId, updates);
};

export default {
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  canAccessCatalog,
  isAdmin,
  getContributors,
  getPendingCatalogRequests,
  updateCatalogRequestStatus
};