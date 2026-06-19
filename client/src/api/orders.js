import api from './axios';

export const createOrder = (items) => api.post('/orders', { items });
export const verifyPayment = (data) => api.post('/orders/verify-payment', data);
export const getMyOrders = () => api.get('/orders/my');
export const getSellerOrders = () => api.get('/orders/seller');
export const getSellerAnalytics = () => api.get('/orders/seller/analytics');
export const updateOrderStatus = (id, status) => api.patch(`/orders/${id}/status`, { status });
