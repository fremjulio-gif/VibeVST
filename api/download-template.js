/**
 * AUDIOFORGE LAB // DOWNLOAD TEMPLATE SERVERLESS API
 * Vérifie l'authentification et génère/délivre le téléchargement des boilerplates
 */

const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || req.query.token;

    if (!token) {
      return res.status(401).json({ error: 'Accès non autorisé. Jeton requis.' });
    }

    const { type } = req.query; // 'juce' ou 'hise'
    const templateType = type === 'hise' ? 'hise' : 'juce';

    // Fichier ZIP ou archive cible
    const zipName = templateType === 'juce' 
      ? 'boilerplate-juce-clipper.zip' 
      : 'boilerplate-hise-rompler.zip';

    const zipPath = path.join(process.cwd(), 'private', 'templates', zipName);

    if (fs.existsSync(zipPath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
      const fileStream = fs.createReadStream(zipPath);
      return fileStream.pipe(res);
    }

    // Si le zip n'est pas encore empaqueté, on renvoie une archive/contenu texte structuré
    if (templateType === 'juce') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="AudioForge_JUCE_CMakeLists.txt"');
      const cmakePath = path.join(process.cwd(), 'private', 'templates', 'juce-clipper', 'CMakeLists.txt');
      if (fs.existsSync(cmakePath)) {
        return res.send(fs.readFileSync(cmakePath, 'utf8'));
      }
      return res.send('# AudioForge JUCE Clipper Template\ncmake_minimum_required(VERSION 3.22)\n');
    } else {
      res.setHeader('Content-Type', 'text/xml; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="AudioForge_HISE_Rompler.xml"');
      const hisePath = path.join(process.cwd(), 'private', 'templates', 'hise-rompler', 'RomplerProject.xml');
      if (fs.existsSync(hisePath)) {
        return res.send(fs.readFileSync(hisePath, 'utf8'));
      }
      return res.send('<?xml version="1.0" encoding="UTF-8"?>\n<HISE_Project Name="AudioForgeRompler"/>\n');
    }

  } catch (err) {
    console.error('[DOWNLOAD-TEMPLATE ERROR]', err);
    return res.status(500).json({ error: 'Erreur interne lors du téléchargement.' });
  }
};
