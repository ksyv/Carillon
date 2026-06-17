const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const EmailTemplate = require('../models/EmailTemplate');
const auth = require('../middleware/auth');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

router.post('/send', auth(['admin', 'responsable']), async (req, res) => {
    const { subject, message, recipients, attachments } = req.body;
    try {
        const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
        let finalHtml = message; let inlineAttachments = [...(attachments || [])];
        const imageRegex = /<img src="data:(image\/[a-zA-Z]*);base64,([^"]*)"/g;
        let match; let imageCount = 0;
        while ((match = imageRegex.exec(message)) !== null) {
            imageCount++; const base64Data = match[2]; const cid = `inlineimg${imageCount}`;
            finalHtml = finalHtml.replace(match[0], `<img src="cid:${cid}"`);
            inlineAttachments.push({ filename: `image${imageCount}`, content: base64Data, encoding: 'base64', cid: cid });
        }
        const htmlMessage = `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">${finalHtml}<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"><p style="font-size: 10px; color: #888;"><i>Message automatique Carillon. Ne pas répondre directement.</i></p></div>`;
        const BATCH_SIZE = 40;
        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const batch = recipients.slice(i, i + BATCH_SIZE);
            await transporter.sendMail({ from: `"Périscolaire Carignan" <${process.env.EMAIL_USER}>`, bcc: batch, replyTo: 'servicescolaire@carignandebordeaux.fr', subject: subject, html: htmlMessage, attachments: inlineAttachments });
            if (i + BATCH_SIZE < recipients.length) await sleep(2000); 
        }
        res.status(200).send("Emails envoyés");
    } catch (error) { res.status(500).send("Erreur lors de l'envoi."); }
});

router.get('/templates', auth(['admin', 'responsable']), async (req, res) => {
    res.json(await EmailTemplate.find());
});

router.post('/templates', auth(['admin', 'responsable']), async (req, res) => {
    const newTemplate = new EmailTemplate(req.body); 
    await newTemplate.save(); 
    res.json(newTemplate);
});

module.exports = router;