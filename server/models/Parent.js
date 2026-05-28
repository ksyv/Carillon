const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ParentSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    isFirstConnection: { type: Boolean, default: true },
    activationToken: { type: String, default: null }
}, { timestamps: true });

// Correction ici : PAS d'async sur la fonction parente, 
// on utilise .hash() de manière classique ou dans un bloc try/catch
ParentSchema.pre('save', function(next) {
    const parent = this;

    if (!parent.isModified('password')) return next();

    bcrypt.hash(parent.password, 10, (err, hash) => {
        if (err) return next(err);
        parent.password = hash;
        next();
    });
});

ParentSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Parent', ParentSchema);