import api from './axios';

export const getAdminProducts = () => api.get('/admin/products');
export const deleteAdminProduct = (id) => api.delete(`/admin/products/${id}`);
export const getAdminUsers = () => api.get('/admin/users');
export const deleteAdminUser = (id) => api.delete(`/admin/users/${id}`);
