# Parcours 1 : Voie Low-Code — Rompler & Instrument Express (<3h)
*Concevoir, programmer et exporter un instrument virtuel commercial sans taper une seule ligne de C++.*

---

## Module 1.1 : Préparation rigoureuse des banques d'échantillons
*Durée estimée : 14 minutes*

La qualité d'un Rompler repose avant tout sur l'intégrité de ses fichiers audio. Un échantillon mal découpé ou pollué par une composante continue (DC Offset) génère des clics et une surcharge CPU inacceptable.

### 1. Spécifications du format d'enregistrement
* **Fréquence d'échantillonnage :** `44,1 kHz` (standard optimal pour les banques polyphoniques, réduisant l'empreinte RAM de 50% par rapport au 96 kHz sans perte dans la bande audible jusqu'à 22 kHz).
* **Résolution binaire :** `24-bit PCM linéaire` (plage dynamique de 144 dB évitant tout bruit de quantification lors de la sommation polyphonique).
* **Format de fichier :** WAV broadcast non compressé (PCM broadcast wave, chunks stéréophoniques).

### 2. Découpe chirurgicale aux passages par zéro (Zero-Crossing)
Tout début d'échantillon (`Sample Start`) doit impérativement coïncider avec une valeur d'amplitude exactement égale à zéro volt (`0.0`).
* Si la découpe est effectuée sur une valeur non nulle ($+0.3$ ou $-0.2$), l'attaque provoquera une discontinuité équivalente à une impulsion de Dirac, générant un clic parasite à haute fréquence.
* Appliquez systématiquement un micro-fade d'attaque de **1 à 3 millisecondes** (courbe logarithmique ou cosinus) pour garantir une transition inaudible.

### 3. Nomenclature normalisée pour l'auto-mapping
Pour que HISE analyse et positionne automatiquement vos échantillons sur le clavier virtuel, respectez la convention de nommage par jetons :

```text
[NomInstrument]_[NomNote]_[NumeroOctave]_[IndexVelocite]_[IndexRoundRobin].wav
```

**Exemple concret pour un piano feutré :**
* `FeltPiano_C3_v1_rr1.wav` (Note : Do 3 / MIDI 60, Vélocité faible, Round-Robin 1)
* `FeltPiano_C3_v2_rr1.wav` (Note : Do 3 / MIDI 60, Vélocité forte, Round-Robin 1)
* `FeltPiano_C3_v1_rr2.wav` (Note : Do 3 / MIDI 60, Vélocité faible, Round-Robin 2)

---

## Module 1.2 : Prise en main de HISE, importation par lot & Root Notes
*Durée estimée : 18 minutes*

HISE (Hart Instruments Sampler Engine) est le framework open-source de référence pour concevoir des instruments virtuels autonomes.

### 1. Arborescence du projet HISE
Dans HISE, créez un nouveau projet `FeltPiano_Project/`. HISE initialise les répertoires obligatoires :
* `AudioFiles/` : Déposez ici l'ensemble des fichiers `.wav`.
* `SampleMaps/` : Fichiers XML décrivant les zones de notes, vélocités et round-robin.
* `Scripts/` : Fichiers JavaScript HISE (`Interface.js`) pour la logique d'interface.
* `UserPresets/` : Presets d'usine au format XML.

### 2. Importation par lot (Batch Import)
1. Dans l'arbre modulaire HISE (`Module Tree`), ajoutez un module **Sampler** (`Sound Generator -> Sampler`).
2. Ouvrez l'éditeur de table d'échantillons (`Sample Map Editor`).
3. Glissez-déposez vos fichiers depuis le dossier `AudioFiles/`.
4. Activez la fonction **Automap using File Name Tokens** :
   - Token 2 = Root Note (ex: `C3` assigné automatiquement à `Key 60`).
   - Token 3 = Velocity Layer (`v1` = 1-64, `v2` = 65-127).
   - Token 4 = Round-Robin Group (alternance automatique sans répétition mécanique).

### 3. Réglage des zones de fondu croisé (Velocity Crossfade)
Activez l'interpolation de volume par fondu en puissance constante (`Equal Power Crossfade`) sur une plage de 8 unités MIDI autour du seuil pour lisser les transitions de vélocité.

---

## Module 1.3 : Chaîne audio intégrée : Enveloppes AHDSR & Filtres SVF
*Durée estimée : 16 minutes*

### 1. Configuration de l'enveloppe d'amplitude (AHDSR)
Chaque voix possède son enveloppe AHDSR câblée sur le module de gain maître :
* **Attack :** 1 ms à 3000 ms.
* **Hold :** 0 ms à 50 ms.
* **Decay :** 10 ms à 4000 ms (pente logarithmique naturelle).
* **Sustain :** -48 dB à 0 dB.
* **Release :** 10 ms à 5000 ms.

### 2. Filtre modélisé SVF (State-Variable Filter)
Insérez un module `Polyphonic Filter` avant la sortie master :
* Type : **LowPass 24 dB/octave** (modélisation analogique avec compensation de résonance).
* Modulation : Raccordez l'enveloppe de vélocité MIDI à la fréquence de coupure (`Cutoff`) pour une brillance proportionnelle à l'intensité du jeu.

---

## Module 1.4 : Script d'interface complet (`Interface.js`) & Presets XML
*Durée estimée : 22 minutes*

Voici le script complet et commenté à insérer dans le fichier `Scripts/Interface.js` de votre projet HISE :

```javascript
/**
 * AUDIOFORGE LAB // HISE ROMPLER INTERFACE SCRIPT
 * Gère les liaisons d'interface graphique, les contrôles AHDSR et les presets
 */

Content.setHeight(500);
Content.setWidth(750);
Content.makeFrontInterface(750, 500);

// 1. Références aux processeurs internes du moteur HISE
const var Sampler = Synth.getChildSynth("MainSampler");
const var AmpEnv = Synth.getModulator("AmpEnvelope");
const var PolyFilter = Synth.getEffect("PolyFilter");
const var StudioReverb = Synth.getEffect("StudioReverb");

// 2. Contrôles de l'enveloppe AHDSR
const var knbAttack = Content.addKnob("knbAttack", 40, 280);
knbAttack.setRange(1.0, 3000.0, 1.0);
knbAttack.set("text", "Attack");
knbAttack.set("suffix", " ms");
knbAttack.setControlCallback(onAttackKnob);

function onAttackKnob(component, value)
{
    AmpEnv.setAttribute(AmpEnv.Attack, value);
}

const var knbDecay = Content.addKnob("knbDecay", 160, 280);
knbDecay.setRange(10.0, 4000.0, 1.0);
knbDecay.set("text", "Decay");
knbDecay.set("suffix", " ms");
knbDecay.setControlCallback(onDecayKnob);

function onDecayKnob(component, value)
{
    AmpEnv.setAttribute(AmpEnv.Decay, value);
}

const var knbSustain = Content.addKnob("knbSustain", 280, 280);
knbSustain.setRange(-48.0, 0.0, 0.1);
knbSustain.set("text", "Sustain");
knbSustain.set("suffix", " dB");
knbSustain.setControlCallback(onSustainKnob);

function onSustainKnob(component, value)
{
    AmpEnv.setAttribute(AmpEnv.Sustain, value);
}

const var knbRelease = Content.addKnob("knbRelease", 400, 280);
knbRelease.setRange(10.0, 5000.0, 1.0);
knbRelease.set("text", "Release");
knbRelease.set("suffix", " ms");
knbRelease.setControlCallback(onReleaseKnob);

function onReleaseKnob(component, value)
{
    AmpEnv.setAttribute(AmpEnv.Release, value);
}

// 3. Contrôles de Filtre & Réverbération
const var knbCutoff = Content.addKnob("knbCutoff", 540, 280);
knbCutoff.setRange(20.0, 20000.0, 1.0);
knbCutoff.set("text", "Cutoff");
knbCutoff.set("suffix", " Hz");
knbCutoff.setControlCallback(onCutoffKnob);

function onCutoffKnob(component, value)
{
    PolyFilter.setAttribute(PolyFilter.Frequency, value);
}

const var knbReverb = Content.addKnob("knbReverb", 640, 280);
knbReverb.setRange(0.0, 1.0, 0.01);
knbReverb.set("text", "Reverb");
knbReverb.setControlCallback(onReverbKnob);

function onReverbKnob(component, value)
{
    StudioReverb.setAttribute(StudioReverb.WetLevel, value);
}

// 4. Navigateur de presets XML natif
const var PresetBrowser = Content.addPresetBrowser("PresetBrowser", 40, 40);
PresetBrowser.set("width", 670);
PresetBrowser.set("height", 200);
```

### Sauvegarde et format des presets XML
Les presets sont sauvegardés sous forme de fichiers XML lisibles et modifiables dans `UserPresets/[Category]/[PresetName].preset` :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Preset Version="1.0.0">
  <Control Value="12.0" ID="knbAttack"/>
  <Control Value="1800.0" ID="knbDecay"/>
  <Control Value="-6.0" ID="knbSustain"/>
  <Control Value="650.0" ID="knbRelease"/>
  <Control Value="12500.0" ID="knbCutoff"/>
  <Control Value="0.25" ID="knbReverb"/>
</Preset>
```

---

## Module 1.5 : Déploiement : Export natif VST3/AU & Rhapsody Player
*Durée estimée : 15 minutes*

### 1. Exportation binaire autonome
1. Rendez-vous dans le menu HISE : `Export -> Export as VSTi / AUi plugin`.
2. Définissez l'identifiant unique à 4 caractères (FourCC / Manufacturer Code, ex: `AFGL`).
3. Compilation :
   - **Windows :** Visual Studio Community (MSVC 2022) -> Génère le fichier `.vst3` 64-bit dans `Binaries/Compiled/VST3/`.
   - **macOS :** Xcode -> Génère le binaire universel (Universal Binary 2 : `x86_64` Intel + `arm64` Apple Silicon M1/M2/M3/M4) dans `Binaries/Compiled/AU/` et `Binaries/Compiled/VST3/`.

### 2. Alternative conteneur : Rhapsody Player
Pour diffuser de nouvelles banques sans recompiler de binaire :
1. Exportez votre projet sous forme d'archive monolithique chiffrée `.hr1` (`Export -> Export as Monolith`).
2. Vos clients ouvrent le fichier `.hr1` directement dans le lecteur gratuit **Rhapsody Player** (disponible pour Windows et macOS).
3. Les échantillons sont protégés contre l'extraction directe et le chargement est instantané.
