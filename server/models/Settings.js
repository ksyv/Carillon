const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({ 
    key: String, 
    value: String 
});

module.exports = mongoose.model('Settings', SettingsSchema);