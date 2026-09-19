#include "PluginProcessor.h"
#include "PluginEditor.h"

AudioForgeProcessor::AudioForgeProcessor()
    : AudioProcessor(BusesProperties()
                     .withInput("Input", juce::AudioChannelSet::stereo(), true)
                     .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      apvts(*this, nullptr, "Parameters", createParameterLayout())
{
    // Résolution unique et mise en cache des pointeurs atomiques
    driveParam   = apvts.getRawParameterValue("drive");
    ceilingParam = apvts.getRawParameterValue("ceiling");
    mixParam     = apvts.getRawParameterValue("mix");
    modeParam    = apvts.getRawParameterValue("mode");
}

AudioForgeProcessor::~AudioForgeProcessor() = default;

juce::AudioProcessorValueTreeState::ParameterLayout AudioForgeProcessor::createParameterLayout()
{
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;

    // 1. Paramètre Drive (0.0 à 24.0 dB)
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{ "drive", 1 },
        "Drive",
        juce::NormalisableRange<float>(0.0f, 24.0f, 0.1f, 0.7f),
        6.0f));

    // 2. Paramètre Ceiling (-24.0 à 0.0 dBFS)
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{ "ceiling", 1 },
        "Ceiling",
        juce::NormalisableRange<float>(-24.0f, 0.0f, 0.1f),
        -0.5f));

    // 3. Paramètre Mix (0.0 à 100.0 %)
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

const juce::String AudioForgeProcessor::getName() const { return "AudioForge Clipper"; }
bool AudioForgeProcessor::acceptsMidi() const { return false; }
bool AudioForgeProcessor::producesMidi() const { return false; }
bool AudioForgeProcessor::isMidiEffect() const { return false; }
double AudioForgeProcessor::getTailLengthSeconds() const { return 0.0; }
int AudioForgeProcessor::getNumPrograms() { return 1; }
int AudioForgeProcessor::getCurrentProgram() { return 0; }
void AudioForgeProcessor::setCurrentProgram(int) {}
const juce::String AudioForgeProcessor::getProgramName(int) { return {}; }
void AudioForgeProcessor::changeProgramName(int, const juce::String&) {}

void AudioForgeProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    juce::dsp::ProcessSpec spec;
    spec.sampleRate = sampleRate;
    spec.maximumBlockSize = static_cast<juce::uint32>(samplesPerBlock);
    spec.numChannels = static_cast<juce::uint32>(getTotalNumOutputChannels());

    distortionEngine.prepare(spec);
}

void AudioForgeProcessor::releaseResources()
{
    distortionEngine.reset();
}

bool AudioForgeProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
     && layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    if (layouts.getMainOutputChannelSet() != layouts.getMainInputChannelSet())
        return false;

    return true;
}

void AudioForgeProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;

    const auto totalNumInputChannels  = getTotalNumInputChannels();
    const auto totalNumOutputChannels = getTotalNumOutputChannels();

    // Nettoyage des canaux de sortie inutilisés
    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear(i, 0, buffer.getNumSamples());

    // Lecture atomique non-bloquante des paramètres
    const float driveVal   = driveParam->load(std::memory_order_relaxed);
    const float ceilingVal = ceilingParam->load(std::memory_order_relaxed);
    const float mixVal     = mixParam->load(std::memory_order_relaxed);
    const int   modeVal    = static_cast<int>(modeParam->load(std::memory_order_relaxed));

    distortionEngine.setParameters(driveVal, ceilingVal, mixVal, static_cast<AudioForge::DSP::DistortionMode>(modeVal));
    distortionEngine.processBlock(buffer);

    // Calcul de la crête pour le VU-mètre (sans verrou)
    float maxPeak = 0.0f;
    for (int ch = 0; ch < totalNumInputChannels; ++ch)
    {
        const float chPeak = buffer.getMagnitude(ch, 0, buffer.getNumSamples());
        if (chPeak > maxPeak)
            maxPeak = chPeak;
    }
    outputPeak.store(maxPeak, std::memory_order_relaxed);
}

bool AudioForgeProcessor::hasEditor() const { return true; }
juce::AudioProcessorEditor* AudioForgeProcessor::createEditor()
{
    return new AudioForgeEditor(*this);
}

void AudioForgeProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void AudioForgeProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));
    if (xmlState != nullptr && xmlState->hasTagName(apvts.state.getType()))
        apvts.replaceState(juce::ValueTree::fromXml(*xmlState));
}

// Fonction d'entrée pour la création du plugin
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new AudioForgeProcessor();
}
