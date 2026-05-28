const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ParentSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    isFirstConnection: { type: Boolean, default: true },
    activationToken: { type: String, default: null }
}, { timestamps: true });

// LA CORRECTION EST ICI : on utilise la fonction callback (next)
ParentSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        this.password = await bcrypt.hash(this.password, 10);
        next(); // <--- C'EST ÇA QUI MANQUAIT !
    } catch (err) {
        next(err); // En cas d'erreur, on passe l'erreur à Mongoose
    }
});

ParentSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Parent', ParentSchema);