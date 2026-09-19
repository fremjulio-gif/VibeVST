cmake_minimum_required(VERSION 3.22)

project(AudioForgeClipper VERSION 1.2.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Découverte du framework JUCE (installé via package manager ou submodule)
find_package(JUCE CONFIG REQUIRED)

# Déclaration du plugin audio VST3 / AU / Standalone
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

# Fichiers sources C++20
target_sources(AudioForgeClipper PRIVATE
    Source/PluginProcessor.h
    Source/PluginProcessor.cpp
    Source/PluginEditor.h
    Source/PluginEditor.cpp
    Source/DSP/DistortionEngine.h
    Source/DSP/TransferFunctions.h
)

# Inclusion des répertoires
target_include_directories(AudioForgeClipper PRIVATE
    Source
    Source/DSP
)

# Liaison des modules JUCE indispensables
target_link_libraries(AudioForgeClipper PRIVATE
    juce::juce_audio_utils
    juce::juce_audio_processors
    juce::juce_dsp
    juce::juce_gui_basics
    juce::juce_graphics
)

# Options du compilateur pour optimisations vectorielles (SIMD)
if (MSVC)
    target_compile_options(AudioForgeClipper PRIVATE /W4 /arch:AVX2 /O2)
else()
    target_compile_options(AudioForgeClipper PRIVATE -Wall -Wextra -O3 -mavx2)
endif()
