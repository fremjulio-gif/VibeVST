#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>
#include "DSP/DistortionEngine.h"

class AudioForgeProcessor : public juce::AudioProcessor
{
public:
    AudioForgeProcessor();
    ~AudioForgeProcessor() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;

    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override;

    const juce::String getName() const override;

    bool acceptsMidi() const override;
    bool producesMidi() const override;
    bool isMidiEffect() const override;
    double getTailLengthSeconds() const override;

    int getNumPrograms() override;
    int getCurrentProgram() override;
    void setCurrentProgram(int index) override;
    const juce::String getProgramName(int index) override;
    void changeProgramName(int index, const juce::String& newName) override;

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    // Récupération de la crête de sortie pour l'interface graphique (Thread-safe)
    [[nodiscard]] float getOutputPeak() const noexcept { return outputPeak.load(std::memory_order_relaxed); }

    // Arborescence APVTS publique pour la liaison avec les composants UI
    juce::AudioProcessorValueTreeState apvts;

private:
    juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    // Cache de pointeurs atomiques pour un accès O(1) dans le thread audio
    std::atomic<float>* driveParam   = nullptr;
    std::atomic<float>* ceilingParam = nullptr;
    std::atomic<float>* mixParam     = nullptr;
    std::atomic<float>* modeParam    = nullptr;

    // Valeur de crête pour les VU-mètres de l'éditeur
    std::atomic<float> outputPeak { 0.0f };

    // Moteur DSP
    AudioForge::DSP::DistortionEngine distortionEngine;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AudioForgeProcessor)
};
