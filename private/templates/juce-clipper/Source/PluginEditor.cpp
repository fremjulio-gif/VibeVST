#include "PluginEditor.h"

// ==============================================================================
// StudioLookAndFeel Implementation
// ==============================================================================
StudioLookAndFeel::StudioLookAndFeel()
{
    setColour(juce::Slider::textBoxTextColourId, juce::Colour(0xff00f0ff));
    setColour(juce::Slider::textBoxOutlineColourId, juce::Colours::transparentBlack);
}

void StudioLookAndFeel::drawRotarySlider(juce::Graphics& g, int x, int y, int width, int height,
                                        float sliderPos, float rotaryStartAngle,
                                        float rotaryEndAngle, juce::Slider&)
{
    const auto radius = (float) juce::jmin(width / 2, height / 2) - 4.0f;
    const auto centreX = (float) x + (float) width * 0.5f;
    const auto centreY = (float) y + (float) height * 0.5f;
    const auto rx = centreX - radius;
    const auto ry = centreY - radius;
    const auto rw = radius * 2.0f;
    const auto angle = rotaryStartAngle + sliderPos * (rotaryEndAngle - rotaryStartAngle);

    // 1. Corps de bouton métallique circulaire (dégradé radial)
    juce::ColourGradient knobGradient(juce::Colour(0xff3a4153), centreX - radius * 0.3f, centreY - radius * 0.3f,
                                      juce::Colour(0xff151821), centreX, centreY, true);
    g.setGradientFill(knobGradient);
    g.fillEllipse(rx, ry, rw, rw);

    // Bordure métallique biseautée
    g.setColour(juce::Colour(0xff232836));
    g.drawEllipse(rx, ry, rw, rw, 2.0f);

    // 2. Arc de graduation actif (Cyber Cyan)
    juce::Path activeArc;
    activeArc.addCentredArc(centreX, centreY, radius - 2.0f, radius - 2.0f, 0.0f, rotaryStartAngle, angle, true);
    g.setColour(juce::Colour(0xff00f0ff).withAlpha(0.6f));
    g.strokePath(activeArc, juce::PathStrokeType(2.5f));

    // 3. Encoche indicatrice lumineuse (Glow)
    juce::Path p;
    const auto pointerLength = radius * 0.65f;
    const auto pointerThickness = 3.0f;
    p.addRoundedRectangle(-pointerThickness * 0.5f, -radius + 4.0f, pointerThickness, pointerLength, 1.5f);
    p.applyTransform(juce::AffineTransform::rotation(angle).translated(centreX, centreY));

    // Lueur Cyber Cyan
    g.setColour(juce::Colour(0xff00f0ff));
    g.fillPath(p);
}

// ==============================================================================
// AudioForgeEditor Implementation
// ==============================================================================
AudioForgeEditor::AudioForgeEditor(AudioForgeProcessor& p)
    : AudioProcessorEditor(&p), audioProcessor(p)
{
    setLookAndFeel(&studioLookAndFeel);

    // 1. Configuration des Sliders rotatifs
    auto setupRotary = [this](juce::Slider& s, juce::Label& l, const juce::String& text, const juce::String& suffix) {
        s.setSliderStyle(juce::Slider::RotaryVerticalDrag);
        s.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 70, 20);
        s.setTextValueSuffix(suffix);
        addAndMakeVisible(s);

        l.setText(text, juce::dontSendNotification);
        l.setFont(juce::Font(11.0f, juce::Font::bold));
        l.setJustificationType(juce::Justification::centred);
        l.setColour(juce::Label::textColourId, juce::Colours::white);
        addAndMakeVisible(l);
    };

    setupRotary(driveSlider, driveLabel, "DRIVE", " dB");
    setupRotary(ceilingSlider, ceilingLabel, "CEILING", " dBFS");
    setupRotary(mixSlider, mixLabel, "MIX", " %");

    // 2. Sélecteur de mode
    modeSelector.addItemList(juce::StringArray{ "Soft Tanh", "Diode Asymétrique", "Hard Clip" }, 1);
    modeSelector.setColour(juce::ComboBox::backgroundColourId, juce::Colour(0xff12151c));
    modeSelector.setColour(juce::ComboBox::outlineColourId, juce::Colour(0xff272d3b));
    modeSelector.setColour(juce::ComboBox::textColourId, juce::Colour(0xff00f0ff));
    addAndMakeVisible(modeSelector);

    // 3. Liaison APVTS bidirectionnelle
    driveAttachment   = std::make_unique<SliderAttachment>(audioProcessor.apvts, "drive", driveSlider);
    ceilingAttachment = std::make_unique<SliderAttachment>(audioProcessor.apvts, "ceiling", ceilingSlider);
    mixAttachment     = std::make_unique<SliderAttachment>(audioProcessor.apvts, "mix", mixSlider);
    modeAttachment    = std::make_unique<ComboBoxAttachment>(audioProcessor.apvts, "mode", modeSelector);

    setSize(620, 360);

    // Lancement du timer d'actualisation visuelle à 60 Hz
    startTimerHz(60);
}

AudioForgeEditor::~AudioForgeEditor()
{
    stopTimer();
    setLookAndFeel(nullptr);
}

void AudioForgeEditor::paint(juce::Graphics& g)
{
    // Châssis métallique brossé Dark Mode
    g.fillAll(juce::Colour(0xff0d0f14));

    // Panneau de rack interne
    const auto bounds = getLocalBounds().toFloat().reduced(10.0f);
    g.setColour(juce::Colour(0xff181c24));
    g.fillRoundedRectangle(bounds, 8.0f);
    g.setColour(juce::Colour(0xff272d3b));
    g.drawRoundedRectangle(bounds, 8.0f, 1.5f);

    // 4 Vis de châssis aux coins
    auto drawScrew = [&g](float sx, float sy) {
        g.setColour(juce::Colour(0xff3a4153));
        g.fillEllipse(sx - 4.0f, sy - 4.0f, 8.0f, 8.0f);
        g.setColour(juce::Colour(0xff10131a));
        g.drawLine(sx - 2.5f, sy - 2.5f, sx + 2.5f, sy + 2.5f, 1.5f);
    };

    drawScrew(18.0f, 18.0f);
    drawScrew((float)getWidth() - 18.0f, 18.0f);
    drawScrew(18.0f, (float)getHeight() - 18.0f);
    drawScrew((float)getWidth() - 18.0f, (float)getHeight() - 18.0f);

    // En-tête du plugin
    g.setColour(juce::Colours::white);
    g.setFont(juce::Font(13.0f, juce::Font::bold));
    g.drawText("AUDIOFORGE // QUICK CLIPPER VST3", 30, 20, 350, 20, juce::Justification::left);

    // VU-mètre à LED crête
    const auto meterBounds = juce::Rectangle<float>((float)getWidth() - 50.0f, 80.0f, 16.0f, 180.0f);
    g.setColour(juce::Colour(0xff090b0f));
    g.fillRect(meterBounds);
    g.setColour(juce::Colour(0xff1a1e27));
    g.drawRect(meterBounds);

    const float fillHeight = meterBounds.getHeight() * juce::jlimit(0.0f, 1.0f, currentPeakLevel);
    const auto fillBounds = meterBounds.withTop(meterBounds.getBottom() - fillHeight);

    juce::Colour meterColor = currentPeakLevel > 0.95f ? juce::Colour(0xffff3366) :
                              currentPeakLevel > 0.75f ? juce::Colour(0xffffaa00) : juce::Colour(0xff00f0ff);
    g.setColour(meterColor);
    g.fillRect(fillBounds);
}

void AudioForgeEditor::resized()
{
    const int startY = 80;
    const int knobSize = 110;

    driveSlider.setBounds(40, startY, knobSize, knobSize);
    driveLabel.setBounds(40, startY + knobSize, knobSize, 20);

    ceilingSlider.setBounds(180, startY, knobSize, knobSize);
    ceilingLabel.setBounds(180, startY + knobSize, knobSize, 20);

    mixSlider.setBounds(320, startY, knobSize, knobSize);
    mixLabel.setBounds(320, startY + knobSize, knobSize, 20);

    modeSelector.setBounds(180, startY + knobSize + 40, 180, 26);
}

void AudioForgeEditor::timerCallback()
{
    // Lecture sans verrou de la crête audio calculée dans processBlock
    const float newPeak = audioProcessor.getOutputPeak();
    // Lissage visuel de redescente
    currentPeakLevel = juce::jmax(newPeak, currentPeakLevel * 0.88f);
    repaint();
}
