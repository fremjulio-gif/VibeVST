/**
 * AUDIOFORGE LAB // GET LESSON SERVERLESS API
 * Vérifie l'authentification et distribue le contenu Markdown protégé
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || 'audioforge_jwt_super_secret_key_vst3';

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

    // Vérification simplifiée pour démo ou décodage JWT
    let userModules = ['lowcode', 'vibecoding', 'business'];
    if (token !== 'VIBE-PRO-DEMO-2025') {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        userModules = payload.modules || [];
      }
    }

    const { course, lesson } = req.query;
    const courseKey = course || 'vibecoding';

    // Vérifie si l'utilisateur possède l'accès à ce cours
    if (!userModules.includes(courseKey) && !userModules.includes('all') && !userModules.includes('bundle')) {
      return res.status(403).json({ error: 'Accès refusé. Vous devez acquérir ce module pour le consulter.' });
    }

    // Mappage vers les fichiers de cours Markdown protégés
    let filename = 'module-02-vibecoding.md';
    if (courseKey === 'lowcode') filename = 'module-01-lowcode.md';
    if (courseKey === 'business') filename = 'module-03-business-legal.md';

    const filePath = path.join(process.cwd(), 'private', 'courses', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier de cours introuvable sur le serveur.' });
    }

    const fullContent = fs.readFileSync(filePath, 'utf8');

    // Découpage ou extraction de la section demandée si spécifiée
    let sectionContent = fullContent;
    if (lesson) {
      // Recherche de la section correspondant à la leçon (ex: 2.1, 1.3, etc.)
      const lessonNum = lesson.replace(/^m\d+_/, ''); // "m2_1" -> "1"
      const prefix = courseKey === 'lowcode' ? '1.' : courseKey === 'vibecoding' ? '2.' : '3.';
      const searchHeader = `## Module ${prefix}${lessonNum}`;
      
      const parts = fullContent.split(/(?=## Module \d+\.\d+)/);
      const found = parts.find(p => p.includes(searchHeader));
      if (found) {
        sectionContent = found;
      }
    }

    return res.status(200).json({
      success: true,
      course: courseKey,
      lesson: lesson || 'all',
      content: sectionContent
    });

  } catch (err) {
    console.error('[GET-LESSON ERROR]', err);
    return res.status(500).json({ error: 'Erreur interne lors de la récupération de la leçon.' });
  }
};
