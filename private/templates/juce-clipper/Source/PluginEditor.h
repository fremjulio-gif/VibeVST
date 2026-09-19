#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include "PluginProcessor.h"

// LookAndFeel personnalisé pour potentiomètres rotatifs métalliques
class StudioLookAndFeel : public juce::LookAndFeel_V4
{
public:
    StudioLookAndFeel();
    void drawRotarySlider(juce::Graphics& g, int x, int y, int width, int height,
                          float sliderPosProportional, float rotaryStartAngle,
                          float rotaryEndAngle, juce::Slider& slider) override;
};

class AudioForgeEditor : public juce::AudioProcessorEditor,
                         private juce::Timer
{
public:
    explicit AudioForgeEditor(AudioForgeProcessor&);
    ~AudioForgeEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    void timerCallback() override;

    AudioForgeProcessor& audioProcessor;
    StudioLookAndFeel studioLookAndFeel;

    // Sliders & Contrôles
    juce::Slider driveSlider;
    juce::Slider ceilingSlider;
    juce::Slider mixSlider;
    juce::ComboBox modeSelector;

    // Labels
    juce::Label driveLabel;
    juce::Label ceilingLabel;
    juce::Label mixLabel;

    // Attachments APVTS bidirectionnels
    using SliderAttachment = juce::AudioProcessorValueTreeState::SliderAttachment;
    using ComboBoxAttachment = juce::AudioProcessorValueTreeState::ComboBoxAttachment;

    std::unique_ptr<SliderAttachment> driveAttachment;
    std::unique_ptr<SliderAttachment> ceilingAttachment;
    std::unique_ptr<SliderAttachment> mixAttachment;
    std::unique_ptr<ComboBoxAttachment> modeAttachment;

    // Indicateur de crête (VU-mètre)
    float currentPeakLevel = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AudioForgeEditor)
};
