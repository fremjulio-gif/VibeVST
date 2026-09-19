/**
 * AUDIOFORGE LAB // DASHBOARD LMS APPLICATION CONTROLLER
 * Gère la navigation, le suivi de progression, le lecteur interactif,
 * les téléchargements et les prompts IA.
 */

const App = (() => {
  // Données des formations et leçons
  const coursesData = {
    'lowcode': {
      id: 'lowcode',
      title: 'Parcours Low-Code : Rompler & Instrument Express',
      badge: 'HISE & RNBO',
      duration: '2h45',
      modules: [
        {
          id: 'm1_1',
          title: '1.1 Préparation rigoureuse des banques de samples',
          duration: '14 min',
          desc: 'Échantillonnage 44.1kHz/24-bit, découpe aux passages par zéro, normalisation et nomenclature standardisée.',
          videoTimecode: '00:14:20:00'
        },
        {
          id: 'm1_2',
          title: '1.2 Import par lot & assignation Root Notes',
          duration: '18 min',
          desc: 'Batch import dans HISE, détection automatique des fondamentales, couches de vélocité et round-robin.',
          videoTimecode: '00:32:45:10'
        },
        {
          id: 'm1_3',
          title: '1.3 Chaîne audio : Enveloppes AHDSR & Filtres SVF',
          duration: '16 min',
          desc: 'Routage interne, courbes d\'enveloppe AHDSR dynamiques, filtres State-Variable et matrice LFO.',
          videoTimecode: '00:48:50:00'
        },
        {
          id: 'm1_4',
          title: '1.4 Interface graphique vectorielle & Presets XML',
          duration: '22 min',
          desc: 'Design de façade DAW, potentiomètres rotatifs métalliques et navigateur de presets XML instantané.',
          videoTimecode: '01:10:15:20'
        },
        {
          id: 'm1_5',
          title: '1.5 Exportation binaire VST3/AU & Rhapsody Player',
          duration: '15 min',
          desc: 'Compilation multi-plateforme (Windows 64-bit, macOS Universal Binary) et alternative Rhapsody Player.',
          videoTimecode: '01:25:30:00'
        }
      ]
    },
    'vibecoding': {
      id: 'vibecoding',
      title: 'Parcours Vibe Coding : Clipper & Saturateur Pro JUCE/C++',
      badge: 'JUCE & C++20',
      duration: '3h30',
      modules: [
        {
          id: 'm2_1',
          title: '2.1 Fondamentaux temps réel stricts en C++ audio',
          duration: '20 min',
          desc: 'Séparation absolue AudioProcessor vs PluginEditor. Zéro malloc/new, pas de lock/mutex dans processBlock.',
          videoTimecode: '00:20:00:00'
        },
        {
          id: 'm2_2',
          title: '2.2 Configuration moderne CMake multi-formats',
          duration: '15 min',
          desc: 'Arborescence CMakeLists.txt universelle pour compiler simultanément VST3, AU et Standalone.',
          videoTimecode: '00:35:10:00'
        },
        {
          id: 'm2_3',
          title: '2.3 Gestion des paramètres avec APVTS & Cache atomique',
          duration: '25 min',
          desc: 'AudioProcessorValueTreeState thread-safe. Mise en cache des std::atomic<float>* dans le constructeur.',
          videoTimecode: '01:00:15:12'
        },
        {
          id: 'm2_4',
          title: '2.4 Élimination du zipper noise avec SmoothedValue',
          duration: '18 min',
          desc: 'Lissage d\'amplitude et de saturation via juce::SmoothedValue<float> pour éliminer tout craquement.',
          videoTimecode: '01:18:20:00'
        },
        {
          id: 'm2_5',
          title: '2.5 Algorithmes de distorsion : Tanh & Diode asymétrique',
          duration: '30 min',
          desc: 'Modélisation tanh(gain * x), saturation asymétrique et protection contre l\'aliasing par oversampling.',
          videoTimecode: '01:48:30:00'
        },
        {
          id: 'm2_6',
          title: '2.6 LookAndFeel vectoriel & VU-mètre découplé (60 Hz)',
          duration: '22 min',
          desc: 'Interface graphique hardware, potentiomètres rotatifs et vu-mètre crête piloté par juce::Timer sans blocage audio.',
          videoTimecode: '02:10:45:00'
        }
      ]
    },
    'business': {
      id: 'business',
      title: 'Toolkit Commercial, Notarisation macOS & Légal',
      badge: 'DISTRIBUTION & SDK',
      duration: '2h15',
      modules: [
        {
          id: 'm3_1',
          title: '3.1 Propriété intellectuelle : SDK VST3 MIT vs GPLv3',
          duration: '18 min',
          desc: 'Conformité légale du SDK VST3 Steinberg (MIT) et clarification des doubles licences HISE / JUCE.',
          videoTimecode: '00:18:00:00'
        },
        {
          id: 'm3_2',
          title: '3.2 Automatisation de la notarisation macOS',
          duration: '28 min',
          desc: 'Scripts xcrun notarytool submit --wait, signature codesign durcie et agrafage de ticket xcrun stapler.',
          videoTimecode: '00:46:12:00'
        },
        {
          id: 'm3_3',
          title: '3.3 Déploiement Windows : InnoSetup & Signtool',
          duration: '22 min',
          desc: 'Création d\'installeurs professionnels .exe via InnoSetup et signature numérique avec certificat de code.',
          videoTimecode: '01:08:20:10'
        },
        {
          id: 'm3_4',
          title: '3.4 Vente & Webhooks Lemon Squeezy / Gumroad',
          duration: '25 min',
          desc: 'Vérification de licence hors ligne (RSA asymétrique) et déblocage automatique par webhooks HMAC SHA-256.',
          videoTimecode: '01:33:45:00'
        }
      ]
    }
  };

  // État applicatif
  let activeCourseId = 'vibecoding';
  let activeLessonId = 'm2_1';
  let completedLessons = new Set();
  let isVideoPlaying = false;
  let videoProgressSeconds = 0;
  let videoDurationSeconds = 1200; // 20 min par défaut
  let playbackTimer = null;

  function init() {
    loadProgress();
    renderCourseTabs();
    renderLessonSidebar();
    renderLessonContent();
    setupVideoPlayer();
    setupDownloadButtons();
    loadPrompts();

    // Initialise le sandbox DSP
    if (window.SandboxDSP) {
      SandboxDSP.init();
    }
  }

  // Sauvegarde & chargement de la progression
  function loadProgress() {
    try {
      const saved = localStorage.getItem('audioforge_completed_lessons');
      if (saved) {
        completedLessons = new Set(JSON.parse(saved));
      }
    } catch (e) {
      completedLessons = new Set();
    }
  }

  function saveProgress() {
    localStorage.setItem('audioforge_completed_lessons', JSON.stringify([...completedLessons]));
    updateProgressBar();
  }

  function toggleLessonCompletion(lessonId) {
    if (completedLessons.has(lessonId)) {
      completedLessons.delete(lessonId);
    } else {
      completedLessons.add(lessonId);
    }
    saveProgress();
    renderLessonSidebar();
  }

  function updateProgressBar() {
    const course = coursesData[activeCourseId];
    if (!course) return;

    const total = course.modules.length;
    let completedInCourse = 0;
    course.modules.forEach(m => {
      if (completedLessons.has(m.id)) completedInCourse++;
    });

    const percent = Math.round((completedInCourse / total) * 100);
    const barEl = document.getElementById('course-progress-bar');
    const textEl = document.getElementById('course-progress-text');

    if (barEl) barEl.style.width = `${percent}%`;
    if (textEl) textEl.innerText = `${percent}% complété (${completedInCourse}/${total})`;
  }

  // Onglets de formation
  function renderCourseTabs() {
    const container = document.getElementById('course-tabs-container');
    if (!container) return;

    container.innerHTML = Object.values(coursesData).map(c => {
      const isActive = c.id === activeCourseId;
      return `
        <button 
          onclick="App.selectCourse('${c.id}')" 
          class="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all duration-200 ${
            isActive 
              ? 'bg-white/15 border border-white/20 text-white font-medium shadow-sm' 
              : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
          }"
        >
          <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#38bdf8]' : 'bg-slate-600'}"></span>
          <span>${c.badge}</span>
        </button>
      `;
    }).join('');
  }

  function selectCourse(courseId) {
    activeCourseId = courseId;
    activeLessonId = coursesData[courseId].modules[0].id;
    renderCourseTabs();
    renderLessonSidebar();
    renderLessonContent();
    updateProgressBar();
    resetVideoPlayer();
  }

  // Barre latérale des leçons
  function renderLessonSidebar() {
    const listEl = document.getElementById('lessons-list');
    if (!listEl) return;

    const course = coursesData[activeCourseId];
    listEl.innerHTML = course.modules.map(m => {
      const isSelected = m.id === activeLessonId;
      const isDone = completedLessons.has(m.id);

      return `
        <div 
          class="group p-3 rounded-xl border transition-all cursor-pointer ${
            isSelected 
              ? 'bg-white/10 border-white/20 shadow-sm' 
              : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
          }"
          onclick="App.selectLesson('${m.id}')"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5">
              <input 
                type="checkbox" 
                ${isDone ? 'checked' : ''} 
                onclick="event.stopPropagation(); App.toggleLessonCompletion('${m.id}')"
                class="mt-0.5 w-3.5 h-3.5 rounded bg-white/5 border-white/10 text-[#38bdf8] focus:ring-0 cursor-pointer"
              >
              <div>
                <h4 class="text-xs font-mono font-medium ${isSelected ? 'text-[#38bdf8]' : 'text-slate-300 group-hover:text-white'}">
                  ${m.title}
                </h4>
                <p class="text-[11px] text-slate-400 font-sans mt-0.5 line-clamp-2">
                  ${m.desc}
                </p>
              </div>
            </div>
            <span class="text-[10px] font-mono text-slate-500 whitespace-nowrap">${m.duration}</span>
          </div>
        </div>
      `;
    }).join('');

    updateProgressBar();
  }

  function selectLesson(lessonId) {
    activeLessonId = lessonId;
    renderLessonSidebar();
    renderLessonContent();
    resetVideoPlayer();
  }

  // Rendu du contenu de leçon
  async function renderLessonContent() {
    const titleEl = document.getElementById('lesson-header-title');
    const badgeEl = document.getElementById('lesson-header-badge');
    const contentEl = document.getElementById('lesson-markdown-body');

    const course = coursesData[activeCourseId];
    const lesson = course.modules.find(m => m.id === activeLessonId);

    if (titleEl) titleEl.innerText = lesson.title;
    if (badgeEl) badgeEl.innerText = `${course.badge} &bull; ${lesson.duration}`;

    if (!contentEl) return;
    contentEl.innerHTML = `
      <div class="flex items-center gap-3 text-slate-400 font-mono text-xs py-8">
        <span class="w-4 h-4 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin"></span>
        <span>Chargement sécurisé de la leçon depuis l'API...</span>
      </div>
    `;

    try {
      const token = AuthGate.getToken();
      const res = await fetch(`/api/get-lesson?course=${activeCourseId}&lesson=${activeLessonId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        contentEl.innerHTML = formatMarkdown(data.content);
      } else {
        // Fallback local intégré
        contentEl.innerHTML = formatMarkdown(getLocalLessonFallback(activeCourseId, activeLessonId));
      }
    } catch (err) {
      contentEl.innerHTML = formatMarkdown(getLocalLessonFallback(activeCourseId, activeLessonId));
    }
  }

  // Lecteur vidéo interactif simulé
  function setupVideoPlayer() {
    const playBtn = document.getElementById('player-play-btn');
    const scrubSlider = document.getElementById('player-scrub');
    const timecodeEl = document.getElementById('player-timecode');

    if (playBtn) {
      playBtn.addEventListener('click', toggleVideoPlay);
    }

    if (scrubSlider) {
      scrubSlider.addEventListener('input', (e) => {
        videoProgressSeconds = (parseFloat(e.target.value) / 100) * videoDurationSeconds;
        updateTimecodeDisplay();
      });
    }
  }

  function toggleVideoPlay() {
    isVideoPlaying = !isVideoPlaying;
    const playBtn = document.getElementById('player-play-btn');
    const playIcon = document.getElementById('player-play-icon');

    if (isVideoPlaying) {
      if (playIcon) playIcon.innerHTML = '&#9632;';
      playbackTimer = setInterval(() => {
        videoProgressSeconds += 1;
        if (videoProgressSeconds >= videoDurationSeconds) {
          videoProgressSeconds = 0;
          toggleVideoPlay();
        }
        updateTimecodeDisplay();
      }, 1000);
    } else {
      if (playIcon) playIcon.innerHTML = '&#9658;';
      clearInterval(playbackTimer);
    }
  }

  function resetVideoPlayer() {
    isVideoPlaying = false;
    videoProgressSeconds = 0;
    clearInterval(playbackTimer);
    const playIcon = document.getElementById('player-play-icon');
    if (playIcon) playIcon.innerHTML = '&#9658;';
    updateTimecodeDisplay();
  }

  function updateTimecodeDisplay() {
    const timecodeEl = document.getElementById('player-timecode');
    const scrubSlider = document.getElementById('player-scrub');

    const mins = Math.floor(videoProgressSeconds / 60);
    const secs = Math.floor(videoProgressSeconds % 60);
    const frames = Math.floor((videoProgressSeconds * 24) % 24);

    const pad = (n) => String(n).padStart(2, '0');
    if (timecodeEl) {
      timecodeEl.innerText = `00:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
    }

    if (scrubSlider) {
      scrubSlider.value = (videoProgressSeconds / videoDurationSeconds) * 100;
    }
  }

  // Téléchargement des boilerplates
  function setupDownloadButtons() {
    window.downloadBoilerplate = async (type) => {
      const token = AuthGate.getToken();
      const btn = event.currentTarget;
      const origText = btn.innerHTML;
      btn.innerHTML = `<span class="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></span> <span>Génération...</span>`;

      try {
        const res = await fetch(`/api/download-template?type=${type}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = type === 'juce' ? 'AudioForge_JUCE_Clipper_Boilerplate.zip' : 'AudioForge_HISE_Rompler_Boilerplate.zip';
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          // Fallback téléchargement direct d'un kit source texte/projet
          downloadFallbackKit(type);
        }
      } catch (e) {
        downloadFallbackKit(type);
      } finally {
        setTimeout(() => { btn.innerHTML = origText; }, 1000);
      }
    };
  }

  function downloadFallbackKit(type) {
    let filename = type === 'juce' ? 'JUCE_Clipper_CMakeLists.txt' : 'HISE_Rompler_Config.xml';
    let content = type === 'juce' 
      ? `# AudioForge Lab - JUCE Clipper CMakeLists.txt\ncmake_minimum_required(VERSION 3.22)\nproject(AudioForgeClipper VERSION 1.0.0 LANGUAGES C CXX)\nset(CMAKE_CXX_STANDARD 20)\nfind_package(JUCE CONFIG REQUIRED)\njuce_add_plugin(AudioForgeClipper FORMATS VST3 AU PRODUCT_NAME "AudioForge Clipper")`
      : `<?xml version="1.0" encoding="UTF-8"?>\n<HISE_Project Name="AudioForgeRompler" Version="1.0.0">\n  <Engine SampleRate="44100" BufferSize="512"/>\n</HISE_Project>`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Chargement des prompts IA
  async function loadPrompts() {
    const listEl = document.getElementById('prompts-list');
    if (!listEl) return;

    try {
      const res = await fetch('/private/prompts/dsp-vibe-prompts.json');
      let prompts = [];
      if (res.ok) {
        prompts = await res.json();
      } else {
        prompts = getFallbackPrompts();
      }

      listEl.innerHTML = prompts.map((p, idx) => `
        <div class="prompt-card p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="text-xs font-mono font-medium text-[#38bdf8]">${p.title}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">${p.targetLLM}</span>
            </div>
            <p class="text-xs text-slate-400 mb-3">${p.description}</p>
            <div class="code-terminal p-3 max-h-32 text-[11px] mb-3 select-all bg-[#050608]">
              <code>${escapeHtml(p.promptText)}</code>
            </div>
          </div>
          <button 
            onclick="App.copyPrompt(this, \`${escapeQuotes(p.promptText)}\`)" 
            class="copy-btn w-full py-2 px-3 rounded-full bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10 font-mono text-xs font-medium transition flex items-center justify-center gap-2"
          >
            <span>&#128203;</span>
            <span>Copier le Prompt IA</span>
          </button>
        </div>
      `).join('');
    } catch (e) {
      listEl.innerHTML = `<p class="text-xs font-mono text-slate-400">Prompts prêts dans le fichier private/prompts/dsp-vibe-prompts.json</p>`;
    }
  }

  function copyPrompt(btn, text) {
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<span>&check;</span> <span>Copié dans le presse-papier !</span>';
      setTimeout(() => { btn.innerHTML = orig; }, 1800);
    });
  }

  // Formatage Markdown simple et élégant
  function formatMarkdown(md) {
    if (!md) return '';
    let html = md
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold text-white mt-5 mb-2.5 font-mono flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-[#38bdf8]"></span>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold text-[#38bdf8] mt-6 mb-3 border-b border-white/10 pb-1.5 font-mono">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-semibold text-white mt-4 mb-3 font-mono">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong class="text-white font-medium">$1</strong>')
      .replace(/`([^`]+)`/gim, '<code class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#38bdf8] font-mono text-xs">$1</code>')
      .replace(/```([a-z]*)\n([\s\S]*?)```/gim, '<pre class="code-terminal p-4 my-3 rounded-xl bg-[#050608] border border-white/10 text-xs font-mono overflow-x-auto"><code>$2</code></pre>')
      .replace(/^\s*\n\*/gm, '<ul class="space-y-1.5 my-3 text-slate-400 text-xs font-sans pl-4 list-disc">')
      .replace(/^- (.*$)/gim, '<li class="text-slate-400 text-xs leading-relaxed">$1</li>')
      .replace(/\n\n/gim, '</p><p class="text-xs text-slate-400 leading-relaxed mb-3">');

    return `<div class="prose prose-invert max-w-none"><p class="text-xs text-slate-300 leading-relaxed mb-4">${html}</p></div>`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeQuotes(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, "\\'").replace(/\n/g, '\\n');
  }

  function getLocalLessonFallback(courseId, lessonId) {
    return `### Bienvenue dans la leçon ${lessonId}
Dans ce module, nous abordons en détail l'ingénierie audio numérique et l'implémentation logicielle.

**Points clés couverts dans cette vidéo :**
- Architecture logicielle conforme aux exigences temps réel.
- Analyse des compromis CPU / latence à 48kHz et 96kHz.
- Mise en pratique avec le code source fourni dans l'onglet **Ressources & Boilerplates**.

\`\`\`cpp
// Exemple : Traitement d'un bloc d'échantillons sans allocation dynamique
void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) noexcept
{
    juce::ScopedNoDenormals noDenormals;
    const auto totalNumInputChannels = getTotalNumInputChannels();
    const auto numSamples = buffer.getNumSamples();

    for (int channel = 0; channel < totalNumInputChannels; ++channel)
    {
        auto* channelData = buffer.getWritePointer(channel);
        for (int sample = 0; sample < numSamples; ++sample)
        {
            channelData[sample] = std::tanh(channelData[sample] * 2.0f);
        }
    }
}
\`\`\`

*Utilise le bac à sable DSP ci-dessous pour tester et visualiser la courbe de saturation.*`;
  }

  function getFallbackPrompts() {
    return [
      {
        title: "Prompt 1 : Algorithme DSP Temps Réel Pur",
        targetLLM: "Claude 3.5 / GPT-4o",
        description: "Génère du code C++20 sans allocation dynamique, vectorisable et thread-safe.",
        promptText: "Tu es un ingénieur DSP C++ senior spécialisé dans JUCE 8. Écris une classe C++ 'DistortionEngine' traitant un tampon audio flottant stéréo avec saturation tanh et oversampling 2x. Contraintes absolues : aucune allocation dynamique (zéro new/malloc/std::vector), aucune opération I/O, noexcept sur toutes les boucles d'échantillons."
      },
      {
        title: "Prompt 2 : Architecture APVTS & Cache Atomique",
        targetLLM: "Claude 3.5 / GPT-4o",
        description: "Crée l'arborescence APVTS complète avec mise en cache des pointeurs std::atomic<float>*.",
        promptText: "Tu es un architecte logiciel audio. Déclare et configure un juce::AudioProcessorValueTreeState complet avec 4 paramètres : Drive (0-24dB), Ceiling (-24-0dBFS), Mix (0-100%) et Mode (Audio/Diode/Hard). Assure la résolution unique des std::atomic<float>* dans le constructeur."
      }
    ];
  }

  return {
    init,
    selectCourse,
    selectLesson,
    toggleLessonCompletion,
    copyPrompt
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
