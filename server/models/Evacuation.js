const mongoose = require('mongoose');

const EvacuationSchema = new mongoose.Schema({
    date: String,
    sessionType: String,
    safeChildren: [{ type: String }]
});

module.exports = mongoose.model('Evacuation', EvacuationSchema);