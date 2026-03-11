const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'responsable', 'staff'], default: 'staff' },
  categoryAccess: { type: String, enum: ['Tous', 'Maternelle', 'Élémentaire'], default: 'Tous' },
  signature: { type: String, default: '' }
});
module.exports = mongoose.model('User', UserSchema);