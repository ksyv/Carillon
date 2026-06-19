const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const Child = require('./models/Child');
const modificationRequestsRoutes = require('./routes/modificationRequests');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.set('trust proxy', 1);

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 1000,
    message: "Trop de requêtes depuis cette IP, veuillez réessayer plus tard."
});
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(async () => { 
      console.log('MongoDB Connected'); 
      try {
          const kidsToMigrate = await Child.find({ family: { $exists: true, $ne: null } });
          for(let k of kidsToMigrate) {
              if (!k.families.includes(k.family)) k.families.push(k.family);
              k.family = undefined;
              await k.save();
          }
          if(kidsToMigrate.length > 0) console.log(`${kidsToMigrate.length} enfants migrés vers le système multi-familles.`);
      } catch(e) { console.error("Erreur migration:", e); }
  })
  .catch(err => console.log(err));

// --- IMPORT ET BRANCHEMENT DES ROUTEURS ---
app.use('/api', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api', require('./routes/requests'));
app.use('/api/children', require('./routes/children'));
app.use('/api/families', require('./routes/families'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/tariffs', require('./routes/tariffs'));
app.use('/api/planned-notes', require('./routes/plannedNotes'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/evacuation', require('./routes/evacuation'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/custom-lists', require('./routes/customLists'));
app.use('/api/mail', require('./routes/mailing'));
app.use('/api/parent', require('./routes/parentPortal'));
app.use('/api/requests', modificationRequestsRoutes);

// --- SERVEUR STATIC FRONTEND (PRODUCTION) ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get(/.*/, (req, res) => res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html')));
}

app.listen(process.env.PORT || 5000, () => console.log(`Server running on port ${process.env.PORT || 5000}`));