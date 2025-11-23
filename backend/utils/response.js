// response.js - small helper (optional)
exports.success = (res, data = {}) => res.json({ ok: true, ...data });
exports.error = (res, status = 500, message = 'error') => res.status(status).json({ ok: false, error: message });
