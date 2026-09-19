# Annonce de Lancement Communautaire // KVR Audio, Reddit & Forums Audio
*Publications rédigées dans un ton strictement factuel, transparent et technique, respectant scrupuleusement les chartes anti-spam et les règles de modération de KVR Audio et Reddit.*

---

## 1. Post pour KVR Audio Forum (Section : *DSP & Plugin Development*)

**Titre du sujet :** [Open Source / Free VST3] Quick Clipper - Educational C++20 / JUCE 8 Soft-Clipper with full source code & CMake template

**Corps du message :**

Hi everyone in the KVR dev community,

Over the past few months, we've noticed how steep the learning curve remains for audio producers who want to transition into audio DSP development. Many get discouraged by boilerplate configuration issues, CMake complexity, or dynamic allocation pitfalls in `processBlock()`.

To help bridge this gap, we've released **Quick Clipper**, a minimalist, zero-allocation soft-clipper plugin developed with **JUCE 8** and **C++20**, completely free and open-source under the **MIT license**.

### Technical Specifications & Architecture:
* **Formats:** VST3 (64-bit Windows & macOS Universal Binary x86_64/arm64) + Audio Unit (AU) for macOS.
* **DSP Transfer Function:** Hyperbolic tangent waveshaper ($y = \tanh(\text{gain} \cdot x)$) with parameter smoothing via `juce::SmoothedValue<float>` to eliminate zipper noise during parameter changes.
* **Real-time Safety:** Strictly zero heap allocation in the audio thread (`noexcept`, no `std::vector`, no locks/mutexes).
* **Parameter Management:** Uses `juce::AudioProcessorValueTreeState` (APVTS) with raw atomic pointers cached in the constructor to avoid string lookups in `processBlock()`.
* **Build System:** Universal `CMakeLists.txt` template ready for VS Code, CLion, or Visual Studio 2022.

### Direct Links & Resources:
* **Pre-compiled Binaries (Win/Mac):** `https://audioforge-lab.io/download-template?type=juce`
* **Complete Source Code on GitHub:** `https://github.com/audioforge-lab/quick-clipper-vst3` *(or downloadable directly from the site)*
* **Interactive DSP Sandbox:** We also built an in-browser Canvas tool to test and visualize non-linear transfer curves (tanh, diode saturation, hard clip) before compiling: `https://audioforge-lab.io/dashboard.html`

We welcome any feedback, code review, or questions regarding the implementation. Hope this helps anyone starting their journey in audio DSP development!

Best regards,  
*AudioForge Lab Team*

---

## 2. Post pour Reddit (r/AudioDSP)

**Titre :** Open-Source educational JUCE 8 clipper template: CMake, APVTS atomic caching, and tanh saturation (MIT License)

**Corps du message :**

Hey r/AudioDSP,

We put together an open-source educational project aimed at beginners and intermediate developers who want a clean, modern starting point for C++ audio plugins without legacy baggage.

**Key design decisions implemented in this repository:**
1. **Zero-allocation real-time safety:** The entire audio processing path is marked `noexcept`. All buffers and smoothed values are pre-allocated in `prepareToPlay()`.
2. **APVTS with atomic pointer caching:** Instead of querying parameters via strings inside the audio loop (`apvts.getRawParameterValue("drive")`), raw `std::atomic<float>*` pointers are resolved once in the constructor and loaded using `std::memory_order_relaxed`.
3. **Parameter smoothing:** Drive and Ceiling parameters are smoothly interpolated over 20ms using `juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear>` to prevent any zipper artifacts during automation.
4. **Modern CMake setup:** A single `CMakeLists.txt` targeting JUCE 8 that builds VST3, AU, and Standalone targets simultaneously on macOS (Apple Silicon + Intel) and Windows 10/11.

The project is released under the **MIT license** so you can freely use the CMake template and DSP code for your own commercial or free plugins.

* Source code and pre-compiled binaries are available at: `https://audioforge-lab.io/download-template?type=juce`
* An interactive web visualizer for the transfer curves ($y = \tanh(x)$ vs asymmetric diode vs hard clipping) can be accessed here: `https://audioforge-lab.io/dashboard.html`

Happy to answer any questions about the routing or CMake setup!

---

## 3. Post pour Reddit (r/AudioProductionDeals / r/FreeSounds)

**Titre :** [Free] AudioForge Lab releases "Quick Clipper" VST3/AU saturation plugin (Win/Mac) + full C++ source code included

**Corps du message :**

Hi all,

AudioForge Lab has released **Quick Clipper**, a free analog-style soft-clipping and saturation plugin for Windows (VST3) and macOS (VST3 / Audio Unit - Apple Silicon and Intel native).

**What it does:**
* Adds warm analog tape-style saturation to drums, 808s, and master buses using a soft hyperbolic tangent (`tanh`) curve.
* Prevents digital inter-sample peaks while increasing perceived loudness.
* Includes real-time CRT phosphor oscilloscope and A/B bypass comparison.
* **100% free with no iLok, no dongle, and no account required to use the compiled binary.**

For those interested in audio programming, the complete C++20 / JUCE project source code and CMake template are also included under the MIT license.

Download link: `https://audioforge-lab.io/#lead-magnet`

Enjoy, and let us know how it sounds on your mixes!

---

## 4. Règles d'Engagement & Réponses aux Commentaires

Pour maintenir une réputation impeccable sur ces plateformes à modération stricte :
1. **Toujours répondre sur le plan technique en premier :** Si un utilisateur pose une question sur la fréquence d'échantillonnage, l'oversampling ou le CPU, répondre avec des données précises (ex: *mesures de latence à 44.1kHz, 64 samples buffer = 1.45 ms*).
2. **Ne jamais faire de hard-selling :** Ne jamais pousser l'offre payante dans les commentaires publics des forums. Laisser le plugin gratuit et la qualité du code source faire le travail d'acquisition.
3. **Remercier et intégrer les retours de la communauté :** Si un développeur senior sur KVR suggère une optimisation SIMD ou une directive de compilation, le remercier chaleureusement et mettre à jour le dépôt GitHub public.
