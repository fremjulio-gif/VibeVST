# Parcours 3 : Cadre Commercial, Légal & Packaging VST
*Sécurité juridique, notarisation macOS automatisée, installeurs Windows et déploiement de vente en ligne.*

---

## Module 3.1 : Propriété intellectuelle, SDK VST3 & Licences GPLv3
*Durée estimée : 18 minutes*

La création d'un plugin VST commercial implique plusieurs couches de licences logicielles et de droits de propriété intellectuelle. Négliger ces aspects peut entraîner le retrait immédiat de vos produits ou des poursuites judiciaires de la part des ayants droit.

### 1. Le SDK VST3 de Steinberg (Licence MIT vs Licence de Marque)
* **Code source du SDK VST3 :** Depuis la version 3.6.8, Steinberg a placé l'API VST3 sous **licence MIT**. Cela signifie que vous êtes 100% libre de compiler, distribuer et commercialiser vos fichiers `.vst3` sans payer de redevances et sans obligation d'ouvrir votre code source.
* **Le Logo & la Marque "VST" :** "VST" est une marque déposée de *Steinberg Media Technologies GmbH*. Si vous souhaitez afficher le logo officiel VST3 sur votre site web ou dans votre manuel, vous devez signer gratuitement en ligne le **Steinberg VST3 Trademark Agreement** sur le portail développeur de Steinberg.

### 2. Le cadre des licences JUCE & HISE
* **JUCE (Double licence) :**
  - *JUCE Starter / Community (GPLv3) :* Gratuite, mais **exige** que vous publiiez l'intégralité du code source de votre plugin sous licence open-source GPLv3.
  - *JUCE Commercial (Indie ou Pro) :* Permet de commercialiser vos plugins en binaire propriétaire fermé sans divulguer votre code source. La licence Indie s'applique si votre chiffre d'affaires annuel est inférieur à 200 000 $.
* **HISE (Double licence) :**
  - *GPLv3 :* Si vous utilisez HISE gratuitement, votre instrument et son code source doivent être sous GPLv3.
  - *Licence Commerciale HISE :* Achat d'une licence perpétuelle permettant de fermer le code et de chiffrer vos banques d'échantillons au format propriétaire `.hr1`.

---

## Module 3.2 : Automatisation de la notarisation sous macOS
*Durée estimée : 28 minutes*

Depuis macOS Catalina (10.15), Apple impose le mécanisme de sécurité **Gatekeeper**. Tout binaire téléchargé sur Internet non signé et non notarisé par les serveurs d'Apple est immédiatement bloqué avec le message d'erreur anxiogène : *"Ce logiciel est endommagé et ne peut pas être ouvert"*.

### 1. Prérequis Apple Developer
* Un compte Apple Developer Program actif (99 $/an).
* Un certificat de type **Developer ID Application** installé dans votre Trousseau d'accès macOS.
* Un mot de passe spécifique d'application généré sur `appleid.apple.com`.

### 2. Script bash d'automatisation complète de notarisation
Créez le script `notarize_plugin.sh` à la racine de votre projet :

```bash
#!/bin/bash
set -e

PLUGIN_NAME="AudioForgeClipper"
DEV_ID="Developer ID Application: Votre Nom (TEAM_ID_12345)"
APPLE_ID="votre-email@studio.io"
TEAM_ID="TEAM_ID_12345"
APP_SPECIFIC_PWD="abcd-efgh-ijkl-mnop"

echo "=== 1. Signature du binaire VST3 avec Hardened Runtime ==="
codesign --force --deep --strict --options runtime --timestamp \
         --sign "$DEV_ID" \
         "build/${PLUGIN_NAME}_artefacts/Release/VST3/${PLUGIN_NAME}.vst3"

echo "=== 2. Signature du binaire AU (Component) ==="
codesign --force --deep --strict --options runtime --timestamp \
         --sign "$DEV_ID" \
         "build/${PLUGIN_NAME}_artefacts/Release/AU/${PLUGIN_NAME}.component"

echo "=== 3. Création de l'archive ZIP pour envoi à Apple ==="
ditto -c -k --keepParent "build/${PLUGIN_NAME}_artefacts/Release/VST3/${PLUGIN_NAME}.vst3" "${PLUGIN_NAME}_VST3.zip"

echo "=== 4. Envoi et attente de la validation Apple Notary ==="
xcrun notarytool submit "${PLUGIN_NAME}_VST3.zip" \
      --apple-id "$APPLE_ID" \
      --team-id "$TEAM_ID" \
      --password "$APP_SPECIFIC_PWD" \
      --wait

echo "=== 5. Agrafage du ticket d'approbation (Staple) ==="
xcrun stapler staple "build/${PLUGIN_NAME}_artefacts/Release/VST3/${PLUGIN_NAME}.vst3"
xcrun stapler staple "build/${PLUGIN_NAME}_artefacts/Release/AU/${PLUGIN_NAME}.component"

echo "=== VÉRIFICATION FINALE DE CONFORMITÉ GATEKEEPER ==="
spctl -a -v "build/${PLUGIN_NAME}_artefacts/Release/VST3/${PLUGIN_NAME}.vst3"

echo "SUCCÈS : Vos binaires sont 100% approuvés par Apple et prêts au déploiement !"
```

---

## Module 3.3 : Déploiement Windows : Installeur InnoSetup & Signtool
*Durée estimée : 22 minutes*

Sous Windows, les plugins VST3 64-bit doivent obligatoirement être installés dans le répertoire système standard :
`C:\Program Files\Common Files\VST3\`

### 1. Script InnoSetup universel (`installer.iss`)

```pascal
[Setup]
AppName=AudioForge Clipper
AppVersion=1.2.0
DefaultDirName={commoncf}\VST3
DefaultGroupName=AudioForge Lab
OutputDir=dist
OutputBaseFilename=AudioForge_Clipper_Setup_x64
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin

[Files]
; Copie du plugin VST3 64-bit
Source: "build\AudioForgeClipper_artefacts\Release\VST3\AudioForgeClipper.vst3\*"; DestDir: "{commoncf}\VST3\AudioForgeClipper.vst3"; Flags: ignoreversion recursesubdirs createallsubdirs
; Copie de la licence et documentation
Source: "README.md"; DestDir: "{app}\AudioForge Lab"; Flags: ignoreversion

[Icons]
Name: "{group}\Désinstaller AudioForge Clipper"; Filename: "{uninstallexe}"
```

### 2. Signature numérique Windows (SignTool)
Pour éviter l'écran d'avertissement bleu **Windows SmartScreen** (*"Windows a protégé votre ordinateur"*), signez votre fichier `AudioForge_Clipper_Setup_x64.exe` avec un certificat de signature de code (Sectigo, DigiCert ou Certum) :

```cmd
signtool.exe sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a "dist\AudioForge_Clipper_Setup_x64.exe"
```

---

## Module 3.4 : Systèmes de protection et vente avec Lemon Squeezy
*Durée estimée : 25 minutes*

### 1. Système de licence hors ligne (RSA asymétrique natif)
Pour protéger votre plugin sans obliger vos clients à être connectés à Internet :
1. Vous générez une paire de clés RSA 2048-bit (Clé Privée sur votre serveur, Clé Publique compilée en dur dans le plugin C++).
2. Lorsqu'un client achète sur Lemon Squeezy, le serveur génère un fichier de licence signé :
   ```json
   {
     "licensee": "Alex Beatmaker",
     "email": "alex@studio.io",
     "product": "AudioForge Clipper",
     "validUntil": "2099-12-31"
   }
   ```
3. Le plugin vérifie la signature avec la clé publique RSA. Aucune connexion réseau requise, piratage rendu extrêmement complexe.

### 2. Raccordement direct aux webhooks de paiement
En configurant votre webhook sur Lemon Squeezy pointant vers l'URL `/api/webhook-lemon-squeezy` :
* La validation de paiement est instantanée.
* L'utilisateur reçoit automatiquement son jeton JWT sécurisé par email.
* L'accès au Dashboard et aux téléchargements est débloqué en temps réel.
