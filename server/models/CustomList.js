const mongoose = require('mongoose');

const CustomListSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    items: [{
        child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
        isChecked: { type: Boolean, default: false }
    }]
}, { timestamps: true });

module.exports = mongoose.model('CustomList', CustomListSchema);