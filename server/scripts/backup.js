// server/scripts/backup.js
const { execSync } = require('child_process');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// On charge les variables d'environnement depuis le dossier parent (server/.env)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Récupération des secrets depuis le .env !
const DB_NAME = process.env.DB_NAME;
const ZIP_PASSWORD = process.env.ZIP_PASSWORD;
const EMAIL_TO = process.env.BACKUP_EMAIL_TO;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// SÉCURITÉ : On vérifie que tout est bien paramétré
if (!DB_NAME || !ZIP_PASSWORD || !EMAIL_TO || !EMAIL_USER || !EMAIL_PASS) {
    console.error("❌ ERREUR FATALE : Variables d'environnement manquantes dans le .env !");
    console.error("Vérifiez DB_NAME, ZIP_PASSWORD, BACKUP_EMAIL_TO, EMAIL_USER et EMAIL_PASS.");
    process.exit(1);
}

const date = new Date().toISOString().split('T')[0];
const backupFolder = path.join(__dirname, `backup-${date}`);
const zipFile = path.join(__dirname, `Carillon-Backup-${date}.zip`);

async function runBackup() {
    try {
        console.log('1. Création de la sauvegarde MongoDB...');
        // On dump la base de données ciblée
        execSync(`mongodump --db ${DB_NAME} --out ${backupFolder}`);

        console.log('2. Compression et chiffrement (Mot de passe requis pour ouvrir)...');
        // On zip le dossier avec le mot de passe du .env
        execSync(`zip -r -P "${ZIP_PASSWORD}" ${zipFile} ${backupFolder}`);
        // On supprime le dossier non-zippé
        execSync(`rm -rf ${backupFolder}`);

        console.log('3. Envoi de l\'email...');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS
            }
        });

        const fileSizeKo = Math.round(fs.statSync(zipFile).size / 1024);

        await transporter.sendMail({
            from: `"Carillon Secours" <${EMAIL_USER}>`,
            to: EMAIL_TO,
            subject: `🛡️ Sauvegarde Carillon - ${date}`,
            text: `Bonjour,\n\nVoici la sauvegarde chiffrée de la base de données Carillon du ${date}.\n\nPoids de l'archive : ${fileSizeKo} Ko.\n\nConservez ce mail en lieu sûr.`,
            attachments: [
                {
                    filename: `Carillon-Backup-${date}.zip`,
                    path: zipFile
                }
            ]
        });

        console.log('4. Nettoyage du fichier local...');
        fs.unlinkSync(zipFile); // On efface le zip du serveur une fois expédié

        console.log('✅ Sauvegarde terminée et expédiée avec succès !');
        process.exit(0);

    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde :', error);
        
        // Nettoyage de secours si ça a planté en cours de route
        if (fs.existsSync(backupFolder)) execSync(`rm -rf ${backupFolder}`);
        if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile);
        
        process.exit(1);
    }
}

runBackup();