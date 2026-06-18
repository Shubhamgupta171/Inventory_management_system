import api from "./client.js";

// Thin, typed-ish wrappers around the REST endpoints. Keeping all network
// calls in one module makes the page components clean and easy to test.

export const ProductsAPI = {
  list: (params) => api.get("/products", { params }).then((r) => r.data),
  get: (id) => api.get(`/products/${id}`).then((r) => r.data),
  create: (payload) => api.post("/products", payload).then((r) => r.data),
  update: (id, payload) => api.put(`/products/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/products/${id}`).then((r) => r.data),
};

export const CustomersAPI = {
  list: (params) => api.get("/customers", { params }).then((r) => r.data),
  get: (id) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (payload) => api.post("/customers", payload).then((r) => r.data),
  remove: (id) => api.delete(`/customers/${id}`).then((r) => r.data),
};

export const OrdersAPI = {
  list: () => api.get("/orders").then((r) => r.data),
  get: (id) => api.get(`/orders/${id}`).then((r) => r.data),
  create: (payload) => api.post("/orders", payload).then((r) => r.data),
  remove: (id) => api.delete(`/orders/${id}`).then((r) => r.data),
};

export const DashboardAPI = {
  summary: () => api.get("/dashboard/summary").then((r) => r.data),
};
