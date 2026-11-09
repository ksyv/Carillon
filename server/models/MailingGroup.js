const mongoose = require('mongoose');

const MailingGroupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    // On stocke directement les ObjectId des enfants liés à ce groupe
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Child' }]
}, { timestamps: true });

module.exports = mongoose.model('MailingGroup', MailingGroupSchema);