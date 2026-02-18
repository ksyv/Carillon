const mongoose = require('mongoose');
const AttendanceSchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format YYYY-MM-DD
  sessionType: { type: String, enum: ['MATIN', 'SOIR'], required: true },
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
  checkIn: { type: Date, default: Date.now },
  checkOut: { type: Date }, // Null = présent
  isLate: { type: Boolean, default: false } // > 18h30
});
// Un seul pointage par créneau par jour par enfant
AttendanceSchema.index({ date: 1, sessionType: 1, child: 1 }, { unique: true });
module.exports = mongoose.model('Attendance', AttendanceSchema);