#pragma once

#include <cmath>
#include <algorithm>

namespace AudioForge::DSP
{
    /**
     * @brief Fonctions de transfert non-linéaires pour la saturation audio.
     * Toutes les fonctions sont inline, sans allocation et noexcept.
     */
    class TransferFunctions
    {
    public:
        // 1. Soft Tanh Clipping (Saturation analogique chaude, harmoniques impaires)
        [[nodiscard]] static inline float softTanh(float x, float driveGain, float ceiling) noexcept
        {
            return ceiling * std::tanh(x * driveGain);
        }

        // 2. Saturation Asymétrique Diode (Germanium / Silicium, harmoniques paires et impaires)
        [[nodiscard]] static inline float asymmetricDiode(float x, float driveGain, float ceiling, float asym = 0.35f) noexcept
        {
            float driven = x * driveGain;
            if (driven > 0.0f)
                driven *= (1.0f + asym);

            return ceiling * (driven / (1.0f + std::abs(driven)));
        }

        // 3. Hard Clipper Numérique (Brickwall, parfait pour les transitoires percutants)
        [[nodiscard]] static inline float hardClip(float x, float driveGain, float ceiling) noexcept
        {
            const float driven = x * driveGain;
            return std::clamp(driven, -ceiling, ceiling);
        }

        // 4. Wavefolder West-Coast (Repliement d'onde Buchla riche en harmoniques)
        [[nodiscard]] static inline float wavefolder(float x, float driveGain, float ceiling) noexcept
        {
            constexpr float piOverTwo = 1.5707963267948966f;
            return ceiling * std::sin(x * driveGain * piOverTwo);
        }
    };
}
