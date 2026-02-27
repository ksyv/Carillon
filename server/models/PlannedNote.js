const mongoose = require('mongoose');

const PlannedNoteSchema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
  note: { type: String, required: true }, // Le message (ex: "Piano à 16h30")
  dates: [{ type: String }] // Un tableau contenant toutes les dates sélectionnées ["2024-03-05", ...]
}, { timestamps: true });

module.exports = mongoose.model('PlannedNote', PlannedNoteSchema);