/**
 * AUDIOFORGE LAB // HISE ROMPLER INTERFACE SCRIPT
 * Gère les liaisons d'interface graphique, les contrôles AHDSR et les presets
 */

Content.setHeight(500);
Content.setWidth(750);
Content.makeFrontInterface(750, 500);

// 1. Références aux processeurs internes
const var Sampler = Synth.getChildSynth("MainSampler");
const var AmpEnv = Synth.getModulator("AmpEnvelope");
const var PolyFilter = Synth.getEffect("PolyFilter");
const var StudioReverb = Synth.getEffect("StudioReverb");

// 2. Création et liaison des potentiomètres AHDSR
const var knbAttack = Content.addKnob("knbAttack", 40, 280);
knbAttack.setRange(1.0, 3000.0, 1.0);
knbAttack.set("text", "Attack");
knbAttack.set("suffix", " ms");
knbAttack.setControlCallback(onAttackKnob);

function onAttackKnob(component, value)
{
    AmpEnv.setAttribute(AmpEnv.Attack, value);
}

const var knbDecay = Content.addKnob("knbDecay", 160, 280);
knbDecay.setRange(10.0, 4000.0, 1.0);
knbDecay.set("text", "Decay");
knbDecay.set("suffix", " ms");
knbDecay.setControlCallback(onDecayKnob);

function onDecayKnob(component, value)
{
    AmpEnv.setAttribute(AmpEnv.Decay, value);
}

const var knbSustain = Content.addKnob("knbSustain", 280, 280);
knbSustain.setRange(-48.0, 0.0, 0.1);
knbSustain.set("text", "Sustain");
knbSustain.set("suffix", " dB");
knbSustain.setControlCallback(onSustainKnob);

function onSustainKnob(component, value)
{
    AmpEnv.setAttribute(AmpEnv.Sustain, value);
}

const var knbRelease = Content.addKnob("knbRelease", 400, 280);
knbRelease.setRange(10.0, 5000.0, 1.0);
knbRelease.set("text", "Release");
knbRelease.set("suffix", " ms");
knbRelease.setControlCallback(onReleaseKnob);

function onReleaseKnob(component, value)
{
    AmpEnv.setAttribute(AmpEnv.Release, value);
}

// 3. Contrôles de Filtre & Réverbération
const var knbCutoff = Content.addKnob("knbCutoff", 540, 280);
knbCutoff.setRange(20.0, 20000.0, 1.0);
knbCutoff.set("text", "Cutoff");
knbCutoff.set("suffix", " Hz");
knbCutoff.setControlCallback(onCutoffKnob);

function onCutoffKnob(component, value)
{
    PolyFilter.setAttribute(PolyFilter.Frequency, value);
}

const var knbReverb = Content.addKnob("knbReverb", 640, 280);
knbReverb.setRange(0.0, 1.0, 0.01);
knbReverb.set("text", "Reverb");
knbReverb.setControlCallback(onReverbKnob);

function onReverbKnob(component, value)
{
    StudioReverb.setAttribute(StudioReverb.WetLevel, value);
}

// 4. Navigateur de presets XML natif
const var PresetBrowser = Content.addPresetBrowser("PresetBrowser", 40, 40);
PresetBrowser.set("width", 670);
PresetBrowser.set("height", 200);
