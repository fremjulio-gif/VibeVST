#pragma once

#include <juce_dsp/juce_dsp.h>
#include "TransferFunctions.h"

namespace AudioForge::DSP
{
    enum class DistortionMode : int
    {
        SoftTanh = 0,
        AsymmetricDiode = 1,
        HardClip = 2
    };

    /**
     * @brief Moteur de distorsion stéréophonique avec lissage de paramètres
     * et suréchantillonnage (Oversampling) optionnel.
     */
    class DistortionEngine
    {
    public:
        DistortionEngine() = default;
        ~DistortionEngine() = default;

        void prepare(const juce::dsp::ProcessSpec& spec) noexcept
        {
            sampleRate = spec.sampleRate;
            
            // Lissage sur 20 ms
            driveSmoothed.reset(spec.sampleRate, 0.02);
            ceilingSmoothed.reset(spec.sampleRate, 0.02);
            mixSmoothed.reset(spec.sampleRate, 0.02);
        }

        void reset() noexcept
        {
            driveSmoothed.setCurrentAndTargetValue(driveSmoothed.getTargetValue());
            ceilingSmoothed.setCurrentAndTargetValue(ceilingSmoothed.getTargetValue());
            mixSmoothed.setCurrentAndTargetValue(mixSmoothed.getTargetValue());
        }

        void setParameters(float driveDb, float ceilingDb, float mixPercent, DistortionMode mode) noexcept
        {
            driveSmoothed.setTargetValue(juce::Decibels::decibelsToGain(driveDb));
            ceilingSmoothed.setTargetValue(juce::Decibels::decibelsToGain(ceilingDb));
            mixSmoothed.setTargetValue(mixPercent * 0.01f);
            currentMode = mode;
        }

        void processBlock(juce::AudioBuffer<float>& buffer) noexcept
        {
            const auto numChannels = buffer.getNumChannels();
            const auto numSamples = buffer.getNumSamples();

            for (int sample = 0; sample < numSamples; ++sample)
            {
                const float curDrive = driveSmoothed.getNextValue();
                const float curCeil  = ceilingSmoothed.getNextValue();
                const float curMix   = mixSmoothed.getNextValue();

                for (int ch = 0; ch < numChannels; ++ch)
                {
                    const float dry = buffer.getSample(ch, sample);
                    float wet = 0.0f;

                    switch (currentMode)
                    {
                        case DistortionMode::SoftTanh:
                            wet = TransferFunctions::softTanh(dry, curDrive, curCeil);
                            break;
                        case DistortionMode::AsymmetricDiode:
                            wet = TransferFunctions::asymmetricDiode(dry, curDrive, curCeil);
                            break;
                        case DistortionMode::HardClip:
                            wet = TransferFunctions::hardClip(dry, curDrive, curCeil);
                            break;
                    }

                    // Wet / Dry crossfade
                    const float out = (dry * (1.0f - curMix)) + (wet * curMix);
                    buffer.setSample(ch, sample, out);
                }
            }
        }

    private:
        double sampleRate = 44100.0;
        DistortionMode currentMode = DistortionMode::SoftTanh;

        juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> driveSmoothed;
        juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> ceilingSmoothed;
        juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> mixSmoothed;
    };
}
