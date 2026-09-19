# AudioForge Lab 🎛️⚡ — Plateforme LMS & Micro-Formations VST

Plateforme d'apprentissage et de distribution pour beatmakers, créateurs audio et sound designers souhaitant concevoir et commercialiser leurs propres plugins audio VST3/AU.

---

## 🏗️ Architecture du Projet

```
/VibeVST/
├── public/                               # Racine publique (fichiers statiques légers)
│   ├── index.html                        # Page de vente principale (Landing page DAW Dark Mode)
│   ├── dashboard.html                    # Interface apprenant (LMS)
│   ├── css/
│   │   ├── studio-theme.css              # Thème Hardware (textures, potentiomètres, cyan/ambre)
│   │   └── sandbox.css                   # Styles du bac à sable DSP interactif
│   └── js/
│       ├── app.js                        # Contrôleur d'interface, player vidéo et persistance
│       ├── sandbox-dsp.js                # Moteur Canvas (visualisation de courbes de saturation)
│       └── auth-gate.js                  # Vérification du jeton de session / redirection
├── api/                                  # Fonctions Serverless Vercel (Node.js)
│   ├── webhook-lemon-squeezy.js          # Réception sécurisée des paiements (HMAC SHA-256)
│   ├── auth-verify.js                    # Validation de la clé de licence client
│   ├── get-lesson.js                     # Distribution sécurisée du contenu Markdown
│   └── download-template.js              # Génération d'URL signée temporaire pour les ZIP
├── private/                              # Contenu protégé (hors de portée du serveur web direct)
│   ├── courses/
│   │   ├── module-01-lowcode.md          # Parcours HISE & Rompler (<3h)
│   │   ├── module-02-vibecoding.md       # Parcours JUCE / C++ (Clipper & Saturateur)
│   │   └── module-03-business-legal.md   # Notarisation, packaging et conformité légale
│   ├── prompts/
│   │   └── dsp-vibe-prompts.json         # 5 invites système calibrées pour LLM
│   └── templates/
│       ├── boilerplate-hise-rompler.zip  # Projet XML HISE préconfiguré
│       ├── boilerplate-juce-clipper.zip  # Arborescence CMake + code source C++20
│       ├── hise-rompler/                 # Projet HISE complet décompressé
│       └── juce-clipper/                 # Projet C++ JUCE complet décompressé
├── vercel.json                           # Configuration des routes d'accès et headers de sécurité
└── package.json                          # Scripts et métadonnées du projet
```

---

## 🚀 Démarrage Rapide en Local

### Option 1 : Lancer le serveur de développement
```bash
# Avec npx serve :
npx serve public -p 8080

# Ou avec npm :
npm start
```
Puis ouvrez :
* **Landing Page :** `http://localhost:8080/index.html`
* **Dashboard Apprenant :** `http://localhost:8080/dashboard.html`

> 💡 **Mode Démo & Test Local :**  
> L'accès au Dashboard est automatiquement actif en local via le token de démonstration `VIBE-PRO-DEMO-2025` (accès complet aux 3 parcours, au bac à sable et aux téléchargements).

---

## 🎛️ Fonctionnalités du Dashboard LMS

1. **Lecteur Vidéo & Notes Synchronisées :**
   - Timecode DAW SMPTE (`00:14:20:00`), barre de défilement scrub et lecture interactive.
   - Suivi de progression par module avec cases à cocher persistées dans `localStorage`.
   - Rendu Markdown dynamique et formaté pour chaque leçon.

2. **AI Vibe Coding Sandbox :**
   - Simulateur Canvas de fonctions de transfert non-linéaires ($y = \tanh(x)$, diode asymétrique $y = \frac{x}{1+|x|}$, hard-clipping, wavefolder).
   - Double affichage temps réel : Courbe de transfert $f(x)$ + Répétition de forme d'onde temporelle comparée (entrée vs sortie saturée).
   - Générateur de code C++20 instantané avec bouton de copie en 1 clic.

3. **Pack de Prompts IA Calibrés (`dsp-vibe-prompts.json`) :**
   - 5 invites optimisées pour Claude 3.5 Sonnet / GPT-4o respectant les règles d'or du temps réel (zéro allocation, thread-safety, APVTS).

4. **Centre de Téléchargement des Boilerplates :**
   - **JUCE 8 / C++20 Clipper :** `CMakeLists.txt`, `PluginProcessor`, `PluginEditor`, `DistortionEngine`.
   - **HISE Rompler :** `RomplerProject.xml`, `SampleMap.xml`, `Interface.js`.

---

## 🛠️ Compilation du Boilerplate C++ (JUCE Clipper)

Dans le dossier `private/templates/juce-clipper/` :
```bash
# 1. Génération du projet de build CMake
cmake -B build -DCMAKE_BUILD_TYPE=Release

# 2. Compilation
cmake --build build --config Release
```
Les binaires `.vst3`, `.component` (AU) et `Standalone` seront générés dans `build/AudioForgeClipper_artefacts/Release/`.

---

## 🔒 Sécurité & Déploiement Serverless (Vercel)

* **Routage sécurisé (`vercel.json`) :** Le dossier `/private` est interdit d'accès HTTP direct (code `403 Forbidden`).
* **Webhooks Lemon Squeezy (`/api/webhook-lemon-squeezy`) :** Validation cryptographique de l'en-tête `x-signature` via HMAC SHA-256 avant toute émission de jeton de session JWT.
* **Distribution contrôlée des cours (`/api/get-lesson`) :** Seuls les utilisateurs porteurs d'un jeton JWT valide accèdent aux guides Markdown.
