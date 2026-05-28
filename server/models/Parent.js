const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ParentSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    isFirstConnection: { type: Boolean, default: true },
    activationToken: { type: String, default: null }
}, { timestamps: true });

// Hashage automatique du mot de passe avant sauvegarde
ParentSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Méthode pour comparer les mots de passe
ParentSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Parent', ParentSchema);