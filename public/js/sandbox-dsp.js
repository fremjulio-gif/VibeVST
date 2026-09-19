/**
 * AUDIOFORGE LAB // AI VIBE CODING SANDBOX (DSP ENGINE & CANVAS VISUALIZER)
 * Visualisation temps réel des fonctions de transfert non-linéaires et générateur C++
 */

const SandboxDSP = (() => {
  // Paramètres DSP
  let currentAlgo = 'tanh';
  let driveDb = 6.0;
  let ceilingDb = -0.5;
  let bias = 0.0;
  let asymmetry = 0.3;

  // Références Canvas
  let curveCanvas = null;
  let curveCtx = null;
  let waveCanvas = null;
  let waveCtx = null;
  let animFrameId = null;

  // Algorithmes mathématiques de transfert
  const algos = {
    tanh: {
      name: 'Soft Tanh Clipping',
      formula: 'y = tanh(gain * x)',
      desc: 'Écrêtage doux analogique symétrique. Harmoniques impaires chaudes.',
      eval: (x, gain, ceil, b, asym) => {
        const inVal = (x + b) * gain;
        return ceil * Math.tanh(inVal);
      },
      cppSnippet: (gain, ceil, b, asym) => `// Algorithme : Soft Tanh Clipping (C++20 / JUCE SIMD-safe)
[[nodiscard]] inline float processSample(float inputSample) noexcept
{
    constexpr float bias = ${b.toFixed(2)}f;
    const float gain = ${gain.toFixed(3)}f;
    const float ceiling = ${ceil.toFixed(3)}f;

    const float driven = (inputSample + bias) * gain;
    return ceiling * std::tanh(driven);
}`
    },

    asymmetric: {
      name: 'Saturation Asymétrique Diode',
      formula: 'y = (x + bias) / (1 + |x + bias|)',
      desc: 'Modélisation de diode germanium. Génère harmoniques paires et impaires.',
      eval: (x, gain, ceil, b, asym) => {
        let inVal = (x + b) * gain;
        if (inVal > 0) inVal *= (1.0 + asym);
        return ceil * (inVal / (1.0 + Math.abs(inVal)));
      },
      cppSnippet: (gain, ceil, b, asym) => `// Algorithme : Saturation Asymétrique Diode (C++20 / JUCE)
[[nodiscard]] inline float processSample(float inputSample) noexcept
{
    constexpr float bias = ${b.toFixed(2)}f;
    constexpr float asym = ${asym.toFixed(2)}f;
    const float gain = ${gain.toFixed(3)}f;
    const float ceiling = ${ceil.toFixed(3)}f;

    float driven = (inputSample + bias) * gain;
    if (driven > 0.0f) 
        driven *= (1.0f + asym);

    return ceiling * (driven / (1.0f + std::abs(driven)));
}`
    },

    hardclip: {
      name: 'Hard Clipper Numérique',
      formula: 'y = clamp(gain * x, -ceil, ceil)',
      desc: 'Écrêtage dur type brickwall. Parfait pour les transients de kicks et 808.',
      eval: (x, gain, ceil, b, asym) => {
        const inVal = (x + b) * gain;
        return Math.max(-ceil, Math.min(ceil, inVal));
      },
      cppSnippet: (gain, ceil, b, asym) => `// Algorithme : Hard Clipper Numérique (C++20 / JUCE)
[[nodiscard]] inline float processSample(float inputSample) noexcept
{
    const float gain = ${gain.toFixed(3)}f;
    const float ceiling = ${ceil.toFixed(3)}f;

    const float driven = inputSample * gain;
    return std::clamp(driven, -ceiling, ceiling);
}`
    },

    wavefolder: {
      name: 'Wavefolder Analogique Buchla',
      formula: 'y = sin(gain * x * pi/2)',
      desc: 'Repliement d\'onde de synthèse West Coast. Richesse harmonique agressive.',
      eval: (x, gain, ceil, b, asym) => {
        const inVal = (x + b) * gain;
        return ceil * Math.sin(inVal * Math.PI * 0.5);
      },
      cppSnippet: (gain, ceil, b, asym) => `// Algorithme : Wavefolder Buchla West-Coast (C++20 / JUCE)
[[nodiscard]] inline float processSample(float inputSample) noexcept
{
    constexpr float piOverTwo = 1.57079632679f;
    const float gain = ${gain.toFixed(3)}f;
    const float ceiling = ${ceil.toFixed(3)}f;

    const float driven = (inputSample + ${b.toFixed(2)}f) * gain;
    return ceiling * std::sin(driven * piOverTwo);
}`
    }
  };

  function init() {
    curveCanvas = document.getElementById('sandbox-curve-canvas');
    waveCanvas = document.getElementById('sandbox-wave-canvas');

    if (curveCanvas) curveCtx = curveCanvas.getContext('2d');
    if (waveCanvas) waveCtx = waveCanvas.getContext('2d');

    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);

    setupControls();
    updateCodeSnippet();
    startRenderLoop();
  }

  function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    [curveCanvas, waveCanvas].forEach(c => {
      if (!c) return;
      const rect = c.parentElement.getBoundingClientRect();
      c.width = rect.width * dpr;
      c.height = rect.height * dpr;
    });
  }

  function setupControls() {
    // Sélecteur d'algorithme
    document.querySelectorAll('.algo-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.algo-btn').forEach(b => {
          b.classList.remove('bg-white/15', 'text-white', 'border-white/20');
          b.classList.add('text-slate-400', 'bg-white/5', 'border-white/10');
        });
        btn.classList.add('bg-white/15', 'text-white', 'border-white/20');
        btn.classList.remove('text-slate-400', 'bg-white/5');

        currentAlgo = btn.dataset.algo;
        const info = algos[currentAlgo];
        const formulaEl = document.getElementById('algo-formula-text');
        const descEl = document.getElementById('algo-desc-text');
        if (formulaEl) formulaEl.innerText = info.formula;
        if (descEl) descEl.innerText = info.desc;

        updateCodeSnippet();
      });
    });

    // Sliders
    const driveSlider = document.getElementById('sb-drive-slider');
    const ceilSlider = document.getElementById('sb-ceil-slider');
    const biasSlider = document.getElementById('sb-bias-slider');
    const asymSlider = document.getElementById('sb-asym-slider');

    if (driveSlider) {
      driveSlider.addEventListener('input', (e) => {
        driveDb = parseFloat(e.target.value);
        const valEl = document.getElementById('sb-drive-val');
        if (valEl) valEl.innerText = `+${driveDb.toFixed(1)} dB`;
        updateCodeSnippet();
      });
    }

    if (ceilSlider) {
      ceilSlider.addEventListener('input', (e) => {
        ceilingDb = parseFloat(e.target.value);
        const valEl = document.getElementById('sb-ceil-val');
        if (valEl) valEl.innerText = `${ceilingDb.toFixed(1)} dBFS`;
        updateCodeSnippet();
      });
    }

    if (biasSlider) {
      biasSlider.addEventListener('input', (e) => {
        bias = parseFloat(e.target.value);
        const valEl = document.getElementById('sb-bias-val');
        if (valEl) valEl.innerText = `${bias.toFixed(2)}`;
        updateCodeSnippet();
      });
    }

    if (asymSlider) {
      asymSlider.addEventListener('input', (e) => {
        asymmetry = parseFloat(e.target.value);
        const valEl = document.getElementById('sb-asym-val');
        if (valEl) valEl.innerText = `${asymmetry.toFixed(2)}`;
        updateCodeSnippet();
      });
    }
  }

  function updateCodeSnippet() {
    const codeEl = document.getElementById('sb-code-output');
    if (!codeEl) return;
    const linearGain = Math.pow(10, driveDb / 20);
    const linearCeil = Math.pow(10, ceilingDb / 20);
    const snippet = algos[currentAlgo].cppSnippet(linearGain, linearCeil, bias, asymmetry);
    codeEl.innerText = snippet;
  }

  function startRenderLoop() {
    function loop() {
      renderCurve();
      renderWave();
      animFrameId = requestAnimationFrame(loop);
    }
    loop();
  }

  // Rendu de la fonction de transfert x -> y
  function renderCurve() {
    if (!curveCanvas || !curveCtx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = curveCanvas.width / dpr;
    const h = curveCanvas.height / dpr;

    curveCtx.save();
    curveCtx.scale(dpr, dpr);
    curveCtx.clearRect(0, 0, w, h);

    // Grille de référence
    curveCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    curveCtx.lineWidth = 1;
    const midX = w / 2;
    const midY = h / 2;

    // Lignes d'axes
    curveCtx.beginPath();
    curveCtx.moveTo(0, midY);
    curveCtx.lineTo(w, midY);
    curveCtx.moveTo(midX, 0);
    curveCtx.lineTo(midX, h);
    curveCtx.stroke();

    // Ligne diagonale linéaire y = x
    curveCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    curveCtx.setLineDash([4, 4]);
    curveCtx.beginPath();
    curveCtx.moveTo(0, h);
    curveCtx.lineTo(w, 0);
    curveCtx.stroke();
    curveCtx.setLineDash([]);

    // Tracé de la courbe non-linéaire
    const linearGain = Math.pow(10, driveDb / 20);
    const linearCeil = Math.pow(10, ceilingDb / 20);
    const evalFunc = algos[currentAlgo].eval;

    curveCtx.strokeStyle = '#38bdf8';
    curveCtx.lineWidth = 2;
    curveCtx.shadowColor = 'transparent';
    curveCtx.shadowBlur = 0;
    curveCtx.beginPath();

    const rangeX = 2.0; // Entrée de -2.0 à +2.0
    for (let px = 0; px <= w; px += 2) {
      const xNorm = ((px - midX) / (w * 0.45)) * rangeX;
      const yOut = evalFunc(xNorm, linearGain, linearCeil, bias, asymmetry);
      const py = midY - (yOut / rangeX) * (h * 0.45);

      if (px === 0) curveCtx.moveTo(px, py);
      else curveCtx.lineTo(px, py);
    }
    curveCtx.stroke();
    curveCtx.restore();
  }

  // Rendu de la forme d'onde temporelle comparée (In vs Out)
  function renderWave() {
    if (!waveCanvas || !waveCtx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = waveCanvas.width / dpr;
    const h = waveCanvas.height / dpr;

    waveCtx.save();
    waveCtx.scale(dpr, dpr);
    waveCtx.clearRect(0, 0, w, h);

    const midY = h / 2;
    const time = Date.now() * 0.003;
    const linearGain = Math.pow(10, driveDb / 20);
    const linearCeil = Math.pow(10, ceilingDb / 20);
    const evalFunc = algos[currentAlgo].eval;

    // 1. Signal sinusoïdal d'entrée (Gris discret pointillé)
    waveCtx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    waveCtx.lineWidth = 1.2;
    waveCtx.setLineDash([3, 3]);
    waveCtx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const inSine = Math.sin((x * 0.03) + time);
      const y = midY - inSine * (h * 0.35);
      if (x === 0) waveCtx.moveTo(x, y);
      else waveCtx.lineTo(x, y);
    }
    waveCtx.stroke();
    waveCtx.setLineDash([]);

    // 2. Signal de sortie saturé (Ambre analogique chaud sans halo baveux)
    waveCtx.strokeStyle = '#f59e0b';
    waveCtx.lineWidth = 2;
    waveCtx.shadowColor = 'transparent';
    waveCtx.shadowBlur = 0;
    waveCtx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const inSine = Math.sin((x * 0.03) + time);
      const outVal = evalFunc(inSine, linearGain, linearCeil, bias, asymmetry);
      const y = midY - outVal * (h * 0.35);
      if (x === 0) waveCtx.moveTo(x, y);
      else waveCtx.lineTo(x, y);
    }
    waveCtx.stroke();
    waveCtx.restore();
  }

  function copyCurrentCode() {
    const codeEl = document.getElementById('sb-code-output');
    if (!codeEl) return;
    navigator.clipboard.writeText(codeEl.innerText).then(() => {
      const btn = document.getElementById('sb-copy-btn');
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '<span>&check;</span> <span>Copié !</span>';
        setTimeout(() => { btn.innerHTML = orig; }, 1500);
      }
    });
  }

  return {
    init,
    copyCurrentCode
  };
})();
