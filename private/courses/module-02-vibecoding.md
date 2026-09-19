# Parcours 2 : Voie Vibe Coding — Soft-Clipper & Saturateur Pro JUCE/C++
*L'ingénierie audio C++ moderne alliée à la puissance des prompts IA pour coder un plugin DSP de qualité studio.*

---

## Module 2.1 : Fondamentaux temps réel stricts en C++ audio
*Durée estimée : 20 minutes*

Le thread audio (`Audio Thread`) s'exécute avec une priorité absolue sous contrainte de temps réel strict. Tout retard de calcul supérieur à la durée d'un bloc — par exemple **1,3 milliseconde** pour un buffer de 64 échantillons à 48 kHz — provoque immédiatement un décrochage de buffer (`Buffer Underrun`), perçu comme un craquement audible.

### Les 4 Règles d'Or absolues dans `processBlock()` :
1. **Zéro allocation de mémoire dynamique :**
   - Interdiction totale de `new`, `malloc()`, `std::vector::push_back()`.
   - Les allocations déclenchent des appels système (`syscall`) et des compactages mémoire imprévisibles.
   - Pré-allouez et dimensionnez tous vos tampons dans `prepareToPlay()`.

2. **Aucune primitive de synchronisation bloquante :**
   - Ne jamais utiliser `std::mutex` ou `std::lock_guard` dans `processBlock()`.
   - Si le thread d'interface (UI) détient le verrou pour repeindre un composant, le thread audio est suspendu (`Priority Inversion`).
   - Utilisez exclusivement des variables atomiques sans verrou (`std::atomic<float>`) ou des files FIFO circulaires (`juce::AbstractFifo`).

3. **Aucune opération d'Entrée/Sortie (I/O) :**
   - Aucun accès disque (`std::fstream`), aucun appel réseau, aucun affichage console (`std::cout`, `printf`, `DBG()`).

4. **Aucune recherche textuelle par chaîne :**
   - Ne jamais appeler `apvts.getRawParameterValue("drive")` dans la boucle d'échantillons. Mettez en cache les pointeurs atomiques une fois pour toutes dans le constructeur.

---

## Module 2.2 : Configuration universelle CMakeLists.txt (C++20)
*Durée estimée : 15 minutes*

```cmake
cmake_minimum_required(VERSION 3.22)
project(AudioForgeClipper VERSION 1.2.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(JUCE CONFIG REQUIRED)

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

target_sources(AudioForgeClipper PRIVATE
    Source/PluginProcessor.h
    Source/PluginProcessor.cpp
    Source/PluginEditor.h
    Source/PluginEditor.cpp
    Source/DSP/DistortionEngine.h
    Source/DSP/TransferFunctions.h
)

target_link_libraries(AudioForgeClipper PRIVATE
    juce::juce_audio_utils
    juce::juce_audio_processors
    juce::juce_dsp
    juce::juce_gui_basics
    juce::juce_graphics
)
```

Compilation :
```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```

---

## Module 2.3 : Formules exactes des fonctions de transfert & Algorithmes DSP
*Durée estimée : 25 minutes*

### 1. Écrêtage doux analogique ($\tanh$)
Modélise la saturation symétrique des bandes magnétiques et préamplis à lampes :
$$y(x) = \text{Ceiling} \times \tanh(\text{Gain} \times x)$$

* Symétrie stricte : $\tanh(-x) = -\tanh(x)$.
* Spectre : Harmoniques impaires prédominantes (3, 5, 7...).

### 2. Saturation asymétrique à diode
Modélise les pédales d'overdrive à diodes appariées imparfaitement :
$$y(x) = \text{Ceiling} \times \frac{x_{\text{driven}}}{1 + |x_{\text{driven}}|}$$
où $x_{\text{driven}} = (x + \text{Bias}) \times \text{Gain} \times (1 + \text{Asymétrie})$ pour $x > 0$.

* Spectre : Génère des harmoniques paires (2, 4...) apportant rondeur et présence.

---

## Module 2.4 : Code source C++ complet et fonctionnel

### 1. `Source/DSP/TransferFunctions.h`
```cpp
#pragma once
#include <cmath>
#include <algorithm>

namespace AudioForge::DSP
{
    [[nodiscard]] inline float softTanh(float x, float gain, float ceiling) noexcept
    {
        return ceiling * std::tanh(x * gain);
    }

    [[nodiscard]] inline float asymmetricDiode(float x, float gain, float ceiling, float bias = 0.0f, float asym = 0.3f) noexcept
    {
        float driven = (x + bias) * gain;
        if (driven > 0.0f)
            driven *= (1.0f + asym);
        return ceiling * (driven / (1.0f + std::abs(driven)));
    }

    [[nodiscard]] inline float hardClip(float x, float gain, float ceiling) noexcept
    {
        return std::clamp(x * gain, -ceiling, ceiling);
    }
}
```

### 2. `Source/DSP/DistortionEngine.h`
```cpp
#pragma once
#include <juce_dsp/juce_dsp.h>
#include "TransferFunctions.h"

class DistortionEngine
{
public:
    DistortionEngine() : oversampling(2, 2, juce::dsp::Oversampling<float>::filterHalfBandFIREquiripple) {}

    void prepare(const juce::dsp::ProcessSpec& spec)
    {
        oversampling.initProcessing(spec.maximumBlockSize);
        oversampling.reset();
    }

    void reset() noexcept { oversampling.reset(); }

    void process(juce::AudioBuffer<float>& buffer, float drive, float ceiling, int mode) noexcept
    {
        juce::dsp::AudioBlock<float> block(buffer);
        auto oversampledBlock = oversampling.processSamplesUp(block);

        const int numChannels = static_cast<int>(oversampledBlock.getNumChannels());
        const int numSamples = static_cast<int>(oversampledBlock.getNumSamples());

        for (int ch = 0; ch < numChannels; ++ch)
        {
            auto* channelData = oversampledBlock.getChannelPointer(ch);
            for (int i = 0; i < numSamples; ++i)
            {
                if (mode == 0)
                    channelData[i] = AudioForge::DSP::softTanh(channelData[i], drive, ceiling);
                else if (mode == 1)
                    channelData[i] = AudioForge::DSP::asymmetricDiode(channelData[i], drive, ceiling);
                else
                    channelData[i] = AudioForge::DSP::hardClip(channelData[i], drive, ceiling);
            }
        }

        oversampling.processSamplesDown(block);
    }

private:
    juce::dsp::Oversampling<float> oversampling;
};
```

### 3. `Source/PluginProcessor.h`
```cpp
#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
#include "DSP/DistortionEngine.h"

class AudioForgeProcessor : public juce::AudioProcessor
{
public:
    AudioForgeProcessor();
    ~AudioForgeProcessor() override = default;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) noexcept override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "AudioForge Clipper"; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    float getOutputPeakLevel() const noexcept { return outputPeakLevel.load(std::memory_order_relaxed); }
    juce::AudioProcessorValueTreeState apvts;

private:
    juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();
    DistortionEngine distortionEngine;

    std::atomic<float>* driveParam = nullptr;
    std::atomic<float>* ceilingParam = nullptr;
    std::atomic<float>* modeParam = nullptr;

    juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> smoothedDrive;
    juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> smoothedCeiling;
    std::atomic<float> outputPeakLevel { 0.0f };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AudioForgeProcessor)
};
```

### 4. `Source/PluginProcessor.cpp`
```cpp
#include "PluginProcessor.h"
#include "PluginEditor.h"

juce::AudioProcessorValueTreeState::ParameterLayout AudioForgeProcessor::createParameterLayout()
{
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID { "drive", 1 }, "Drive", juce::NormalisableRange<float>(0.0f, 24.0f, 0.1f, 0.7f), 6.0f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID { "ceiling", 1 }, "Ceiling", juce::NormalisableRange<float>(-24.0f, 0.0f, 0.1f), -0.5f));
    params.push_back(std::make_unique<juce::AudioParameterChoice>(
        juce::ParameterID { "mode", 1 }, "Mode", juce::StringArray { "Soft Tanh", "Diode Asymétrique", "Hard Clip" }, 0));
    return { params.begin(), params.end() };
}

AudioForgeProcessor::AudioForgeProcessor()
    : AudioProcessor(BusesProperties().withInput("Input", juce::AudioChannelSet::stereo(), true)
                                      .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      apvts(*this, nullptr, "Parameters", createParameterLayout())
{
    driveParam = apvts.getRawParameterValue("drive");
    ceilingParam = apvts.getRawParameterValue("ceiling");
    modeParam = apvts.getRawParameterValue("mode");
}

void AudioForgeProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    juce::dsp::ProcessSpec spec { sampleRate, static_cast<juce::uint32>(samplesPerBlock), 2 };
    distortionEngine.prepare(spec);
    smoothedDrive.reset(sampleRate, 0.02);
    smoothedCeiling.reset(sampleRate, 0.02);
}

void AudioForgeProcessor::releaseResources() { distortionEngine.reset(); }

void AudioForgeProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) noexcept
{
    juce::ScopedNoDenormals noDenormals;
    const float targetDrive = juce::Decibels::decibelsToGain(driveParam->load(std::memory_order_relaxed));
    const float targetCeil = juce::Decibels::decibelsToGain(ceilingParam->load(std::memory_order_relaxed));
    const int mode = static_cast<int>(modeParam->load(std::memory_order_relaxed));

    smoothedDrive.setTargetValue(targetDrive);
    smoothedCeiling.setTargetValue(targetCeil);

    distortionEngine.process(buffer, smoothedDrive.getNextValue(), smoothedCeiling.getNextValue(), mode);
    outputPeakLevel.store(buffer.getMagnitude(0, buffer.getNumSamples()), std::memory_order_relaxed);
}

juce::AudioProcessorEditor* AudioForgeProcessor::createEditor() { return new AudioForgeEditor(*this); }
void AudioForgeProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}
void AudioForgeProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));
    if (xmlState && xmlState->hasTagName(apvts.state.getType()))
        apvts.replaceState(juce::ValueTree::fromXml(*xmlState));
}
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new AudioForgeProcessor(); }
```

### 5. `Source/PluginEditor.h`
```cpp
#pragma once
#include "PluginProcessor.h"

class AudioForgeEditor : public juce::AudioProcessorEditor, private juce::Timer
{
public:
    explicit AudioForgeEditor(AudioForgeProcessor&);
    ~AudioForgeEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    void timerCallback() override;

    AudioForgeProcessor& processorRef;
    juce::Slider driveSlider;
    juce::Slider ceilingSlider;
    juce::ComboBox modeSelector;

    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> driveAttach;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> ceilingAttach;
    std::unique_ptr<juce::AudioProcessorValueTreeState::ComboBoxAttachment> modeAttach;

    float currentPeak = 0.0f;
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AudioForgeEditor)
};
```

### 6. `Source/PluginEditor.cpp`
```cpp
#include "PluginEditor.h"

AudioForgeEditor::AudioForgeEditor(AudioForgeProcessor& p)
    : AudioProcessorEditor(&p), processorRef(p)
{
    setSize(480, 320);

    driveSlider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    driveSlider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 70, 20);
    addAndMakeVisible(driveSlider);
    driveAttach = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(processorRef.apvts, "drive", driveSlider);

    ceilingSlider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    ceilingSlider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 70, 20);
    addAndMakeVisible(ceilingSlider);
    ceilingAttach = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(processorRef.apvts, "ceiling", ceilingSlider);

    modeSelector.addItemList(juce::StringArray { "Soft Tanh", "Diode Asymétrique", "Hard Clip" }, 1);
    addAndMakeVisible(modeSelector);
    modeAttach = std::make_unique<juce::AudioProcessorValueTreeState::ComboBoxAttachment>(processorRef.apvts, "mode", modeSelector);

    startTimerHz(60);
}

AudioForgeEditor::~AudioForgeEditor() { stopTimer(); }

void AudioForgeEditor::timerCallback()
{
    currentPeak = processorRef.getOutputPeakLevel();
    repaint();
}

void AudioForgeEditor::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colour::fromRGB(9, 10, 12));
    g.setColour(juce::Colours::white);
    g.setFont(juce::FontOptions(14.0f));
    g.drawText("AUDIOFORGE CLIPPER", 20, 15, 200, 20, juce::Justification::left);

    // VU-mètre épuré 60 Hz
    auto vuArea = juce::Rectangle<float>(430, 40, 12, 230);
    g.setColour(juce::Colour::fromRGB(25, 28, 35));
    g.fillRect(vuArea);

    float meterH = juce::jlimit(0.0f, 230.0f, currentPeak * 230.0f);
    g.setColour(juce::Colour::fromRGB(56, 189, 248));
    g.fillRect(vuArea.removeFromBottom(meterH));
}

void AudioForgeEditor::resized()
{
    driveSlider.setBounds(40, 80, 140, 140);
    ceilingSlider.setBounds(220, 80, 140, 140);
    modeSelector.setBounds(140, 250, 160, 28);
}
```

---

## Module 2.5 : Pack des 5 Prompts IA Calibrés (Vibe Coding)

### Prompt 1 : Algorithme DSP Temps Réel Pur
> "Tu es un ingénieur DSP C++ senior spécialisé dans JUCE 8. Écris une classe C++ 'DistortionEngine' traitant un tampon audio flottant stéréo avec saturation tanh et oversampling 2x. Contraintes absolues : aucune allocation dynamique (zéro new/malloc/std::vector), aucune opération I/O, noexcept sur toutes les boucles d'échantillons."

### Prompt 2 : Architecture APVTS & Cache Atomique
> "Tu es un architecte logiciel audio. Déclare et configure un juce::AudioProcessorValueTreeState complet avec 3 paramètres : Drive (0-24dB), Ceiling (-24-0dBFS) et Mode (Soft/Diode/Hard). Assure la résolution unique des std::atomic<float>* dans le constructeur."

### Prompt 3 : Lissage de Paramètres sans Zipper Noise
> "Écris le code d'intégration de juce::SmoothedValue<float> pour lisser le paramètre Drive d'un clipper. Fréquence d'échantillonnage 44.1kHz à 192kHz, temps de rampe de 20ms, conversion décibels vers gain linéaire dans processBlock."

### Prompt 4 : Interface LookAndFeel Vectorielle & Minimaliste
> "Crée une classe dérivée de juce::LookAndFeel_V4 pour dessiner des potentiomètres rotatifs plats style Teenage Engineering : fond noir OLED, chanfrein blanc à 10% d'opacité, pointeur cyan de 2px, zéro effet skeuomorphique 3D."

### Prompt 5 : Oscilloscope Temps Réel Découplé 60 Hz
> "Implémente un composant juce::Component avec juce::Timer pour afficher la forme d'onde audio en temps réel sans jamais bloquer le thread audio. Utilise un juce::AbstractFifo circulaire thread-safe."
