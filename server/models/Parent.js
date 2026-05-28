const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ParentSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    isFirstConnection: { type: Boolean, default: true },
    activationToken: { type: String, default: null }
}, { timestamps: true });

// Plus de hook pre('save'), on gère le hash dans index.js
ParentSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Parent', ParentSchema);