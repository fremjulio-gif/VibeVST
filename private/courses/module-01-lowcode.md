# Parcours 1 : Voie Low-Code — Rompler & Instrument Express (<3h)
*Concevoir, programmer et exporter un instrument virtuel commercial sans taper une seule ligne de C++.*

---

## Module 1.1 : Préparation rigoureuse des banques d'échantillons
*Durée estimée : 14 minutes*

La qualité d'un Rompler ne dépend pas seulement de son moteur, mais avant tout de l'intégrité chirurgicale de sa matière première audio. Un échantillon mal découpé ou pollué par une composante continue (DC Offset) génère des bruits de clic et une surcharge CPU inacceptable.

### 1. Spécifications du format d'enregistrement
* **Fréquence d'échantillonnage :** `44,1 kHz` (standard optimal pour les banques d'échantillons polyphoniques, réduisant l'empreinte RAM de 50% par rapport au 96 kHz sans perte audible dans les aigus audibles jusqu'à 22 kHz).
* **Résolution binaire :** `24-bit PCM linéaire` (plage dynamique de 144 dB évitant tout bruit de quantification lors des sommations multi-voix).
* **Format de fichier :** WAV broadcast non compressé (PCM broadcast wave).

### 2. Découpe chirurgicale aux passages par zéro (Zero-Crossing)
Tout début d'échantillon (`Sample Start`) doit impérativement coïncider avec une valeur d'amplitude exactement égale à zéro volt (`0.0`).
* Si la découpe est effectuée alors que le signal est à $+0.3$ ou $-0.2$, l'attaque provoquera un transitoire abrupt assimilable à une impulsion de Dirac, générant un clic parasite à haute fréquence.
* Appliquez systématiquement un micro-fade d'attaque de **1 à 3 millisecondes** (courbe logarithmique ou cosinus) pour garantir une transition inaudible.

### 3. Nomenclature normalisée pour l'auto-mapping
Pour que HISE analyse et positionne automatiquement vos échantillons sur le clavier virtuel, respectez scrupuleusement la convention de nommage suivante :

```
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

### 1. Création de l'arborescence du projet HISE
Dans HISE, configurez un nouveau projet :
1. Créez un dossier `FeltPiano_Project/`.
2. HISE génère automatiquement les sous-dossiers : `AudioFiles/`, `SampleMaps/`, `Scripts/`, `UserPresets/`.
3. Placez l'intégralité de vos fichiers `.wav` dans le dossier `AudioFiles/`.

### 2. Importation par lot (Batch Import)
1. Dans l'arbre modulaire HISE (`Module Tree`), ajoutez un module **Sampler** (`Sound Generator -> Sampler`).
2. Ouvrez l'éditeur de table d'échantillons (`Sample Map Editor`).
3. Glissez-déposez vos fichiers depuis l'explorateur HISE.
4. Activez la fonction **Automap using File Name Tokens** :
   - Token 2 = Root Note (ex: `C3` assigné automatiquement à `Key 60`).
   - Token 3 = Velocity Layer (ex: `v1` = Range 1-64, `v2` = Range 65-127).
   - Token 4 = Round-Robin Group (alternance automatique sans effet "mitraillette").

### 3. Réglage des zones de fondu croisé (Velocity Crossfade)
Pour éviter un saut de timbre artificiel lors de la transition d'une vélocité douce à forte, activez l'interpolation de volume par fondu en puissance constante (`Equal Power Crossfade`) sur une plage de 8 unités MIDI autour du seuil.

---

## Module 1.3 : Chaîne audio intégrée : Enveloppes AHDSR & Filtres SVF
*Durée estimée : 16 minutes*

### 1. Configuration de l'enveloppe d'amplitude (AHDSR)
Chaque voix de polyphonie possède sa propre enveloppe AHDSR (Attack, Hold, Decay, Sustain, Release) câblée sur le module de gain maître :
* **Attack :** Réglable de 1 ms (transitoire percutant) à 2500 ms (nappe atmosphérique).
* **Hold :** Maintien du niveau crête pendant 10 ms pour les instruments à percussion.
* **Decay :** Pente logarithmique pour épouser la décroissance acoustique naturelle.
* **Sustain :** Niveau en dB relatif ($-12\text{ dB}$ à $0\text{ dB}$).
* **Release :** Queue de résonance naturelle lors du relâchement de la touche (ex: 850 ms pour simuler la résonance du meuble de piano).

### 2. Filtre modélisé SVF (State-Variable Filter)
Insérez un module de filtrage `Polyphonic Filter` avant la sortie master :
* Type : **LowPass 24 dB/octave** (modélisation analogique avec compensation de résonance).
* Modulation : Raccordez l'enveloppe de vélocité MIDI à la fréquence de coupure (`Cutoff`) : plus la note est frappée fort, plus le filtre s'ouvre, imitant la brillance acoustique d'un vrai instrument.

---

## Module 1.4 : Interface graphique vectorielle & Presets XML
*Durée estimée : 22 minutes*

### 1. Conception de la façade DAW
HISE intègre un moteur graphique vectoriel ultra-performant.
1. Ouvrez le concepteur d'interface (`Interface Designer`).
2. Définissez les dimensions de la fenêtre du plugin (ex: `720x480 pixels`).
3. Déposez des potentiomètres rotatifs (`Knobs`) pour :
   - `knbAttack`, `knbRelease`
   - `knbCutoff`, `knbResonance`
   - `knbReverbMix`

### 2. Liaison des contrôles (Binding) sans code complexe
Dans le panneau des propriétés du composant :
* Définissez la propriété `processorId` sur le nom de votre module (ex: `AHDSR Envelope1`).
* Définissez `parameterId` sur la cible (ex: `Attack`).
* La synchronisation bidirectionnelle est instantanée et thread-safe.

### 3. Gestionnaire de presets (fichiers XML)
Chaque état du plugin peut être enregistré sous forme de preset utilisateur :
* Les fichiers sont sérialisés au format XML dans `UserPresets/[Category]/[PresetName].preset`.
* Intégrez le composant natif `PresetBrowser` qui gère automatiquement la recherche par tag, le tri alphabétique et le rappel d'état instantané sans coupure audio.

---

## Module 1.5 : Déploiement : Export natif VST3/AU & Rhapsody Player
*Durée estimée : 15 minutes*

### 1. Exportation autonome (Standalone, VST3, AU)
1. Rendez-vous dans le menu HISE : `Export -> Export as VSTi / AUi plugin`.
2. Renseignez l'identifiant unique à 4 caractères (FourCC / Manufacturer Code, ex: `AFGL`).
3. HISE compile les sources C++ générées via le compilateur natif :
   - **Windows :** Visual Studio Community (MSVC 2022) -> Génère un fichier `.vst3` 64-bit optimisé AVX2.
   - **macOS :** Xcode -> Génère un binaire universel (Universal 2 : x86_64 pour Intel et arm64 pour Apple Silicon M1/M2/M3/M4).

### 2. Alternative allégée : Rhapsody Player
Pour les créateurs qui ne souhaitent pas recompiler un binaire pour chaque nouvelle banque de samples :
* Exportez votre banque au format conteneur chiffré `.hr1` (HISE Monolith).
* Vos utilisateurs finaux glissent simplement le fichier `.hr1` dans le lecteur gratuit **Rhapsody Player** (disponible sous Windows/Mac).
* Zéro problème de compatibilité OS, mise à jour instantanée et protection native de vos échantillons contre le pillage.
