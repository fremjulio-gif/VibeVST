# Parcours 2 : Voie Vibe Coding — Soft-Clipper & Saturateur Pro JUCE/C++
*L'ingénierie audio C++ moderne alliée à la puissance des prompts IA pour coder un plugin DSP de qualité studio.*

---

## Module 2.1 : Fondamentaux temps réel stricts en C++ audio
*Durée estimée : 20 minutes*

Le développement d'un plugin audio est l'une des disciplines les plus exigeantes de l'informatique : le thread audio (`Audio Thread`) s'exécute avec une priorité quasi-temps réel. Tout retard de calcul supérieur à la durée d'un tampon (buffer) — par exemple **1,3 milliseconde** pour un buffer de 64 échantillons à 48 kHz — provoque immédiatement un décrochage de buffer (`Buffer Underrun`), perçu par l'utilisateur comme un craquement ou un bruit de distorsion numérique désagréable.

### Les 4 Règles d'Or absolues dans `processBlock()` :
1. **Zéro allocation de mémoire dynamique :**
   - L'utilisation de `new`, `malloc()`, `std::vector::push_back()` ou de toute fonction qui redimensionne dynamiquement la mémoire sur le tas (`Heap`) est formellement interdite.
   - Les allocations déclenchent des appels système (`syscall`) imprévisibles et peuvent provoquer des pauses de plusieurs millisecondes si le système d'exploitation doit compacter la mémoire.
   - **Solution :** Allouez et pré-dimensionnez tous vos tampons dans `prepareToPlay()`.

2. **Aucune primitive de synchronisation bloquante :**
   - Ne jamais verrouiller de `std::mutex`, `std::lock_guard` ou de section critique dans le thread audio.
   - Si le thread d'interface utilisateur (UI) détient le verrou pour repeindre un composant, le thread audio sera suspendu (`Priority Inversion`), provoquant des craquements immédiats.
   - **Solution :** Utilisez des variables atomiques sans verrou (`std::atomic<float>`) ou des files FIFO circulaires sans verrou (`juce::AbstractFifo`).

3. **Aucune opération d'Entrée/Sortie (I/O) :**
   - Aucun accès disque (`std::fstream`), aucun appel réseau, aucun affichage console (`std::cout`, `printf`, `DBG()`).
   - L'accès disque peut bloquer le thread pendant des dizaines de millisecondes en cas de latence mécanique ou de cache système.

4. **Aucune recherche textuelle par chaîne de caractères :**
   - Ne jamais appeler `apvts.getRawParameterValue("drive")` à chaque bloc d'échantillons. Cette méthode effectue une recherche de chaîne dans un dictionnaire interne, inutilement coûteuse en CPU.
   - **Solution :** Mettez en cache les pointeurs atomiques une fois pour toutes dans le constructeur de l'AudioProcessor.

---

## Module 2.2 : Configuration du compilateur CMake multi-formats
*Durée estimée : 15 minutes*

CMake est désormais le standard industriel pour construire des plugins JUCE multiplateformes, remplaçant l'ancien outil propriétaire Projucer.

### Structure standard d'un `CMakeLists.txt` moderne (JUCE 7 & 8) :

```cmake
cmake_minimum_required(VERSION 3.22)

project(AudioForgeClipper VERSION 1.2.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Découverte du framework JUCE
find_package(JUCE CONFIG REQUIRED)

# Déclaration du plugin audio
juce_add_plugin(AudioForgeClipper
    COMPANY_NAME "AudioForge Lab"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD TRUE
    PLUGIN_MANUFACTURER_CODE AFGL
    PLUGIN_CODE AfCl
    FORMATS VST3 AU Standalone
    PRODUCT_NAME "AudioForge Clipper"
)

# Fichiers sources
target_sources(AudioForgeClipper PRIVATE
    Source/PluginProcessor.h
    Source/PluginProcessor.cpp
    Source/PluginEditor.h
    Source/PluginEditor.cpp
    Source/DSP/DistortionEngine.h
    Source/DSP/TransferFunctions.h
)

# Liaison des modules JUCE indispensables
target_link_libraries(AudioForgeClipper PRIVATE
    juce::juce_audio_utils
    juce::juce_audio_processors
    juce::juce_dsp
    juce::juce_gui_basics
    juce::juce_graphics
)
```

Grâce à cette configuration, une seule commande `cmake -B build` suivie de `cmake --build build --config Release` génère simultanément le plugin au format VST3 pour Windows/Mac et AU (Audio Unit) pour Logic Pro sur macOS.

---

## Module 2.3 : Gestion des paramètres avec APVTS & Cache atomique
*Durée estimée : 25 minutes*

L'APVTS (`juce::AudioProcessorValueTreeState`) est la pierre angulaire de la gestion des paramètres dans JUCE. Il assure la synchronisation bidirectionnelle entre l'AudioProcessor, le PluginEditor, l'automation du séquenceur hôte (DAW) et la sauvegarde des presets d'état (XML).

### 1. Déclaration de l'APVTS dans `PluginProcessor.h`
```cpp
class AudioForgeProcessor : public juce::AudioProcessor
{
public:
    AudioForgeProcessor();
    ~AudioForgeProcessor() override;

    // ...
    juce::AudioProcessorValueTreeState apvts;

private:
    juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    // Cache de pointeurs atomiques pour un accès temps réel ultra-rapide (O(1))
    std::atomic<float>* driveParam   = nullptr;
    std::atomic<float>* ceilingParam = nullptr;
    std::atomic<float>* mixParam     = nullptr;
    std::atomic<float>* modeParam    = nullptr;
};
```

### 2. Définition du ParameterLayout dans `PluginProcessor.cpp`
```cpp
juce::AudioProcessorValueTreeState::ParameterLayout AudioForgeProcessor::createParameterLayout()
{
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;

    // 1. Paramètre Drive (0 à 24 dB) avec échelle logarithmique
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{ "drive", 1 },
        "Drive",
        juce::NormalisableRange<float>(0.0f, 24.0f, 0.1f, 0.7f),
        6.0f));

    // 2. Paramètre Ceiling (-24 à 0 dBFS)
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{ "ceiling", 1 },
        "Ceiling",
        juce::NormalisableRange<float>(-24.0f, 0.0f, 0.1f),
        -0.5f));

    // 3. Paramètre Mix (0 à 100 %)
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{ "mix", 1 },
        "Mix",
        juce::NormalisableRange<float>(0.0f, 100.0f, 1.0f),
        100.0f));

    // 4. Paramètre Mode (Choix d'algorithme DSP)
    params.push_back(std::make_unique<juce::AudioParameterChoice>(
        juce::ParameterID{ "mode", 1 },
        "Mode",
        juce::StringArray{ "Soft Tanh", "Diode Asymétrique", "Hard Clip" },
        0));

    return { params.begin(), params.end() };
}
```

### 3. Résolution des pointeurs atomiques dans le constructeur
```cpp
AudioForgeProcessor::AudioForgeProcessor()
    : AudioProcessor(BusesProperties().withInput("Input", juce::AudioChannelSet::stereo(), true)
                                      .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      apvts(*this, nullptr, "Parameters", createParameterLayout())
{
    // Résolution unique et mise en cache des pointeurs atomiques
    driveParam   = apvts.getRawParameterValue("drive");
    ceilingParam = apvts.getRawParameterValue("ceiling");
    mixParam     = apvts.getRawParameterValue("mix");
    modeParam    = apvts.getRawParameterValue("mode");
}
```

---

## Module 2.4 : Suppression du zipper noise avec `juce::SmoothedValue`
*Durée estimée : 18 minutes*

Lorsque l'utilisateur manipule un potentiomètre ou que le séquenceur exécute une ligne d'automation, la valeur du paramètre change par incréments discrets. Si vous appliquez directement ce saut brutal d'une valeur à l'autre au début de chaque bloc audio, vous créez une discontinuité dans la forme d'onde, générant un parasite audible appelé **zipper noise** (bruit de fermeture éclair).

### L'implémentation du lissage d'amplitude
JUCE propose la classe templatisée `juce::SmoothedValue<float>` qui interpole linéairement ou exponentiellement la valeur échantillon par échantillon :

```cpp
// Dans PluginProcessor.h
juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> smoothedDriveGain;
juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> smoothedCeiling;

// Dans prepareToPlay(double sampleRate, int samplesPerBlock)
void AudioForgeProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    // Configure une durée de rampe de lissage de 20 millisecondes (parfait pour l'oreille humaine)
    smoothedDriveGain.reset(sampleRate, 0.02);
    smoothedCeiling.reset(sampleRate, 0.02);
}

// Dans processBlock()
void AudioForgeProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) noexcept
{
    const float targetDriveDb = driveParam->load(std::memory_order_relaxed);
    const float targetCeilDb  = ceilingParam->load(std::memory_order_relaxed);

    // Convertit les décibels en gain linéaire
    smoothedDriveGain.setTargetValue(juce::Decibels::decibelsToGain(targetDriveDb));
    smoothedCeiling.setTargetValue(juce::Decibels::decibelsToGain(targetCeilDb));

    const int numSamples = buffer.getNumSamples();
    for (int sample = 0; sample < numSamples; ++sample)
    {
        // Obtient le gain lissé en temps réel pour l'échantillon courant
        const float currentDrive = smoothedDriveGain.getNextValue();
        const float currentCeil  = smoothedCeiling.getNextValue();

        // Traitement du signal avec le gain parfaitement lissé
    }
}
```

---

## Module 2.5 : Algorithmes de distorsion : Tanh & Diode asymétrique
*Durée estimée : 30 minutes*

### 1. La fonction hyperbolique tangente ($\tanh$)
La fonction $\tanh(x)$ est l'idéal mathématique pour modéliser la saturation douce analogique des bandes magnétiques et des préamplificateurs à lampes symétriques :
$$\lim_{x \to \infty} \tanh(x) = +1, \quad \lim_{x \to -\infty} \tanh(x) = -1$$

* Elle est strictement symétrique : $\tanh(-x) = -\tanh(x)$.
* Elle ne génère que des **harmoniques impaires** (harmoniques 3, 5, 7...), conférant un caractère chaud et dense au signal.

```cpp
[[nodiscard]] inline float softTanh(float x, float driveGain, float ceiling) noexcept
{
    return ceiling * std::tanh(x * driveGain);
}
```

### 2. La saturation asymétrique à diode
Dans les circuits analogiques réels (pédales de saturation type Boss DS-1 ou Tube Screamer), les deux diodes de clipping ne sont jamais rigoureusement identiques. Cette asymétrie brise la symétrie de la forme d'onde et injecte des **harmoniques paires** (harmoniques 2, 4...), très recherchées pour apporter de la rondeur et de la clarté :

$$y = \frac{x}{1 + |x|}$$

En ajoutant un léger décalage continu (`DC Bias`) ou un coefficient d'asymétrie sur l'alternance positive :
```cpp
[[nodiscard]] inline float asymmetricDiode(float x, float driveGain, float ceiling, float asym = 0.25f) noexcept
{
    float driven = x * driveGain;
    if (driven > 0.0f)
        driven *= (1.0f + asym); // Étirement asymétrique de l'alternance positive

    return ceiling * (driven / (1.0f + std::abs(driven)));
}
```

### 3. Gestion de l'aliasing via l'Oversampling
Toute non-linéarité produit des harmoniques supérieures. Si une harmonique dépasse la fréquence de Nyquist ($\frac{f_s}{2}$, soit 24 kHz à 48 kHz), elle se replie dans le spectre audible (`aliasing`), créant un son métallique et sale.
* **Solution :** Utilisez le module `juce::dsp::Oversampling<float>` configuré en $2\times$ ou $4\times$. Le signal est suréchantillonné, saturé, puis filtré par un filtre anti-repliement ultra-raide à phase linéaire avant d'être décimé.

---

## Module 2.6 : Interface graphique vectorielle & VU-mètre découplé (60 Hz)
*Durée estimée : 22 minutes*

### Séparation thread graphique et thread audio via `juce::Timer`
Pour éviter que l'affichage visuel ne ralentisse le traitement du son :
1. Le thread audio stocke la valeur de crête maximale du tampon dans une variable atomique :
   ```cpp
   outputPeakLevel.store(maxVal, std::memory_order_relaxed);
   ```
2. La classe `PluginEditor` hérite de `juce::Timer` et s'actualise à 60 Hz :
   ```cpp
   void AudioForgeEditor::timerCallback()
   {
       const float peak = audioProcessor.getOutputPeakLevel();
       vuMeterComponent.setLevel(peak);
       vuMeterComponent.repaint();
   }
   ```
3. Grâce à cette architecture non-bloquante, même si la carte graphique de l'utilisateur est temporairement saturée, le son reste **100% limpide et ininterrompu**.
