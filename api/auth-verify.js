/**
 * AUDIOFORGE LAB // AUTH VERIFY SERVERLESS API
 * Vérifie le jeton JWT ou la clé de série transmise par le client.
 */

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
      return res.status(401).json({ valid: false, error: 'Jeton manquant.' });
    }

    // Gestion du token démo pour les tests locaux
    if (token === 'VIBE-PRO-DEMO-2025') {
      return res.status(200).json({
        valid: true,
        user: {
          email: 'beatmaker@studio.io',
          name: 'Membre AudioForge Demo',
          modules: ['lowcode', 'vibecoding', 'business'],
          tier: 'Bundle Accès Complet'
        }
      });
    }

    // Décodage et vérification du JWT
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(401).json({ valid: false, error: 'Format de jeton invalide.' });
    }

    const [headerB64, bodyB64, signatureB64] = parts;
    const base64Url = (str) => Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const expectedSig = base64Url(crypto.createHmac('sha256', JWT_SECRET).update(`${headerB64}.${bodyB64}`).digest());

    if (signatureB64 !== expectedSig) {
      return res.status(403).json({ valid: false, error: 'Signature du jeton invalide.' });
    }

    const payload = JSON.parse(Buffer.from(bodyB64, 'base64').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ valid: false, error: 'Jeton expiré.' });
    }

    return res.status(200).json({
      valid: true,
      user: {
        email: payload.email,
        name: payload.name,
        modules: payload.modules || ['lowcode', 'vibecoding', 'business'],
        tier: payload.tier || 'Accès Standard'
      }
    });

  } catch (err) {
    return res.status(500).json({ valid: false, error: 'Erreur interne de vérification.' });
  }
};
