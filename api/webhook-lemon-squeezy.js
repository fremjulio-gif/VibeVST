/**
 * AUDIOFORGE LAB // SERVERLESS WEBHOOK LEMON SQUEEZY
 * Réceptionne les paiements, valide la signature HMAC SHA-256
 * et délivre le jeton d'accès sécurisé (JWT).
 */

const crypto = require('crypto');

// Clé secrète configurée dans Lemon Squeezy Webhook Settings
const WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || 'audioforge_demo_webhook_secret_2025';
const JWT_SECRET = process.env.JWT_SECRET || 'audioforge_jwt_super_secret_key_vst3';

module.exports = async (req, res) => {
  // Seules les requêtes POST sont autorisées
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Seul POST est accepté.' });
  }

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = req.headers['x-signature'];

    if (!signature) {
      return res.status(401).json({ error: 'En-tête x-signature manquant.' });
    }

    // 1. Validation de la signature cryptographique HMAC SHA-256
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
      return res.status(403).json({ error: 'Signature HMAC invalide. Rejet de la requête.' });
    }

    // 2. Traitement de l'événement de commande Lemon Squeezy
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventName = payload.meta ? payload.meta.event_name : 'order_created';

    if (eventName === 'order_created') {
      const orderData = payload.data.attributes;
      const customerEmail = orderData.user_email;
      const customerName = orderData.user_name || 'Beatmaker';
      const orderId = payload.data.id;
      const variantName = orderData.first_order_item ? orderData.first_order_item.variant_name : 'Bundle Intégral';

      // Détermination des modules débloqués
      let unlockedModules = ['lowcode'];
      if (variantName.toLowerCase().includes('vibe')) {
        unlockedModules = ['vibecoding'];
      } else if (variantName.toLowerCase().includes('bundle') || variantName.toLowerCase().includes('complet')) {
        unlockedModules = ['lowcode', 'vibecoding', 'business'];
      }

      // 3. Génération du Jeton de Session Sécurisé (JWT)
      const tokenPayload = {
        sub: orderId,
        email: customerEmail,
        name: customerName,
        modules: unlockedModules,
        tier: variantName,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365) // Valide 1 an
      };

      const base64Url = (str) => Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const body = base64Url(JSON.stringify(tokenPayload));
      const sig = base64Url(crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest());
      const jwtToken = `${header}.${body}.${sig}`;

      console.log(`[LEMON SQUEEZY] Commande validée #${orderId} pour ${customerEmail} - Accès: ${unlockedModules.join(', ')}`);

      return res.status(200).json({
        success: true,
        message: 'Commande traitée avec succès. Accès débloqué.',
        orderId,
        email: customerEmail,
        accessUrl: `https://${req.headers.host || 'audioforge.io'}/dashboard.html?token=${jwtToken}`
      });
    }

    return res.status(200).json({ received: true, ignoredEvent: eventName });

  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    return res.status(500).json({ error: 'Erreur interne lors du traitement du webhook.' });
  }
};
