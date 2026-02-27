const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  categoryAccess: { type: String, enum: ['Tous', 'Maternelle', 'Élémentaire'], default: 'Tous' } // NOUVEAU
});
module.exports = mongoose.model('User', UserSchema);