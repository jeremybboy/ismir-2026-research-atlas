import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_URL = 'https://ismir2026.ismir.net/accepted-papers';
const RETRIEVED_AT = '2026-10-06';
const inputPath = process.argv[2];

if (!inputPath) {
  throw new Error('Usage: npm run import:data -- /path/to/reviewed-accepted-papers.html');
}

const html = await readFile(inputPath, 'utf8');
const table = html.match(/<table\b[^>]*>[\s\S]*?<\/table>/i)?.[0];
if (!table) throw new Error('No accepted-papers table found in source HTML.');

const decode = (value) => value
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
  .map((row) => [...row[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => decode(cell[1])))
  .filter((cells) => cells.length === 2 && cells[0] !== 'Paper Title');

function splitOutsideParentheses(value) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '(') depth += 1;
    if (value[index] === ')') depth = Math.max(0, depth - 1);
    if (value[index] === ';' && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

function parseAuthor(value) {
  if (!value.endsWith(')')) return { name: value.trim(), affiliation: null };
  let depth = 0;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    if (value[index] === ')') depth += 1;
    if (value[index] === '(') {
      depth -= 1;
      if (depth === 0) {
        return {
          name: value.slice(0, index).trim(),
          affiliation: value.slice(index + 1, -1).trim() || null,
        };
      }
    }
  }
  return { name: value.trim(), affiliation: null };
}

const topics = [
  {
    id: 'transcription-analysis',
    label: 'Transcription and musical analysis',
    shortLabel: 'Transcription & analysis',
    color: '#1d777e',
    marker: 'square',
    description: 'Title-derived work on transcription, score understanding, timing, harmony, structure, and musical analysis.',
  },
  {
    id: 'generation-collaboration',
    label: 'Generative music and human–AI collaboration',
    shortLabel: 'Generation & collaboration',
    color: '#bd4d37',
    marker: 'diamond',
    description: 'Title-derived work on music generation, accompaniment, improvisation, controllability, and human–AI creation.',
  },
  {
    id: 'representations-discovery',
    label: 'Music representations, understanding, and discovery',
    shortLabel: 'Representations & discovery',
    color: '#6357ad',
    marker: 'triangle',
    description: 'Title-derived work on representations, retrieval, recommendation, datasets, identification, and multimodal understanding.',
  },
  {
    id: 'production-transformation',
    label: 'Production, separation, and audio transformation',
    shortLabel: 'Production & transformation',
    color: '#987111',
    marker: 'cross',
    description: 'Title-derived work on mixing, effects, source separation, restoration, synthesis, and audio transformation.',
  },
  {
    id: 'evaluation-culture',
    label: 'Evaluation, perception, and cultural coverage',
    shortLabel: 'Evaluation & culture',
    color: '#44754d',
    marker: 'circle',
    description: 'Title-derived work on evaluation, perception, bias, cultural coverage, detection, and research benchmarks.',
  },
];

const topicRules = {
  'transcription-analysis': [
    /transcri/i, /score/i, /beat/i, /downbeat/i, /onset/i, /pitch/i, /chord/i, /tablature/i,
    /notation/i, /musicxml/i, /alignment/i, /motif/i, /harmon/i, /polyphony/i, /music structure/i,
    /musical analysis/i, /roman numeral/i, /velocity estimation/i, /technique detection/i,
  ],
  'generation-collaboration': [
    /generat/i, /accompaniment/i, /improvis/i, /harmonization/i, /human.ai/i, /style transfer/i,
    /music inpainting/i, /arrangement/i, /smartlooper/i, /synthesis/i, /composer/i,
  ],
  'representations-discovery': [
    /represent/i, /retriev/i, /recommend/i, /identif/i, /caption/i, /dataset/i, /corpus/i,
    /foundation model/i, /classification/i, /discovery/i, /embedding/i, /multimodal/i, /lyrics/i,
    /similarity/i, /understand/i, /tokenization/i, /tokenisation/i, /music expectation/i,
  ],
  'production-transformation': [
    /mixing/i, /separation/i, /transform/i, /effect/i, /\bfx\b/i, /audio codec/i, /restoration/i,
    /denoising/i, /resynthesis/i, /synthesizer inversion/i, /sound morph/i, /bandwidth extension/i,
    /stem blending/i, /audio editing/i, /music editing/i, /audio latent/i, /source-separated/i,
  ],
  'evaluation-culture': [
    /evaluat/i, /benchmark/i, /percept/i, /bias/i, /cultur/i, /tradition/i, /emotion/i,
    /quality metric/i, /detection/i, /reliability/i, /aesthetic/i, /taste/i, /difficulty/i,
    /ethiopian/i, /korean/i, /iranian/i, /arabic/i, /maqam/i, /pansori/i, /gugak/i,
    /balkan/i, /taiwanese/i, /cochlear/i, /physiology/i, /cross-cultural/i,
  ],
};

const manualPrimary = new Map([
  ['Off-Manifold Robustness in Synthesizer Inversion with Joint Distribution Flow Matching', 'production-transformation'],
  ['From Prediction to Collaboration: Interactive Symbolic Music Analysis', 'generation-collaboration'],
  ['Does Notation Matter? MusicXML Tokenisation for Symbolic Music Generation and Understanding', 'representations-discovery'],
  ['Separate-and-Detect: Unified Drum Transcription and Stem Generation via Latent Diffusion', 'production-transformation'],
  ['Detection of AI-Generated Stems Within Hybrid Human-AI Music', 'evaluation-culture'],
  ['How Much AI Is in This Track? Quantifying the Proportion of AI-Generated Stems in Hybrid Music Mixtures', 'evaluation-culture'],
]);

const tagRules = [
  ['real-time', /real[ -]?time|online|streaming|low-latency/i],
  ['transcription', /transcri/i],
  ['beat-tracking', /beat|downbeat|tatum/i],
  ['pitch', /pitch|melody/i],
  ['scores-notation', /score|notation|musicxml|tablature/i],
  ['music-analysis', /analysis|analytic|motif|structure|harmon|chord|polyphony/i],
  ['symbolic-music', /symbolic|midi/i],
  ['generation', /generat|composer|inpainting/i],
  ['human-ai', /human.ai|collaboration|interactive|coaching/i],
  ['accompaniment-improvisation', /accompaniment|improvis|looper/i],
  ['controllability', /controll|steering|guidance/i],
  ['representation-learning', /represent|embedding|latent|encoder/i],
  ['retrieval-discovery', /retriev|recommend|identif|discovery|exploration|search/i],
  ['multimodal', /multimodal|audio.visual|music.text|lyrics|caption/i],
  ['datasets-benchmarks', /dataset|corpus|benchmark|suite/i],
  ['foundation-models', /foundation model|large audio language|\bllm\b/i],
  ['audio-effects', /effect|\bfx\b|mixing|stem blending/i],
  ['source-separation', /separation|separate-and-detect/i],
  ['audio-transformation', /transform|morph|restoration|denoising|resynthesis|bandwidth extension/i],
  ['synthesis', /synthesis|synthesizer/i],
  ['evaluation', /evaluat|assess|metric|reliability|quality/i],
  ['perception-emotion', /percept|emotion|aesthetic|taste|expectation|physiology|cochlear/i],
  ['bias-coverage', /bias|cross-cultural|culture-specific|globally diverse|traditional|ethiopian|korean|iranian|arabic|maqam|pansori|gugak|balkan|taiwanese/i],
  ['detection-provenance', /detect|ai-generated|synthetic-to-real/i],
  ['diffusion', /diffusion/i],
  ['performance', /performance|playability|technique|virtuoso/i],
  ['lyrics-language', /lyric|language|phoneme|words/i],
];

function slugify(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 88);
}

function choosePrimary(title) {
  if (manualPrimary.has(title)) return manualPrimary.get(title);
  const scores = topics.map(({ id }, priority) => ({
    id,
    priority,
    score: topicRules[id].reduce((total, rule) => total + (rule.test(title) ? 1 : 0), 0),
  }));
  scores.sort((a, b) => b.score - a.score || a.priority - b.priority);
  return scores[0].score > 0 ? scores[0].id : 'representations-discovery';
}

const seenIds = new Map();
const sourceRecords = rows.map(([title, rawAuthors], index) => ({
  sourceOrder: index + 1,
  title,
  rawAuthors,
}));

const papers = sourceRecords.map(({ title, rawAuthors, sourceOrder }) => {
  const baseId = slugify(title);
  const duplicateCount = (seenIds.get(baseId) ?? 0) + 1;
  seenIds.set(baseId, duplicateCount);
  const id = duplicateCount === 1 ? baseId : `${baseId}-${duplicateCount}`;
  const primaryTopic = choosePrimary(title);
  const conceptTags = tagRules.filter(([, rule]) => rule.test(title)).map(([tag]) => tag);
  if (conceptTags.length === 0) conceptTags.push(primaryTopic);
  return {
    id,
    sourceOrder,
    title,
    authors: splitOutsideParentheses(rawAuthors).map(parseAuthor),
    primaryTopic,
    conceptTags: [...new Set(conceptTags)],
    sourceUrl: SOURCE_URL,
    paperUrl: null,
    classificationBasis: 'title-and-metadata-inference',
  };
});

const titleToId = new Map(papers.map((paper) => [paper.title, paper.id]));
const trail = (id, title, premise, paperTitles) => ({
  id,
  title,
  premise,
  editorialBasis: 'curated-title-and-metadata-exploration',
  paperIds: paperTitles.map((paperTitle) => {
    const paperId = titleToId.get(paperTitle);
    if (!paperId) throw new Error(`Trail paper not found: ${paperTitle}`);
    return paperId;
  }),
});

const trails = [
  trail('build-an-ai-band', 'Build an AI band', 'A curated path through accompaniment, improvisation, playable generation, and arrangement systems.', [
    'Streaming Generation for Music Accompaniment',
    'LiveBand: Live Accompaniment Generation in the Audio Domain',
    'Learning Jazz Pianist Style with Cross-Attention Conditioning',
    'SmartLooper: a Framework for Personalized Human-AI Musical Improvisation',
    'Pianoid: 3D Pianist Body Motion Generation from MIDI',
  ]),
  trail('design-intelligent-fx', 'Design intelligent FX', 'A curated path through effects representation, mixing control, morphing, and production-aware models.', [
    'PEACE: Joint Embeddings of DSP Effects Code and Audio',
    'StemFX: Learning Mixing Style Representations via Autoregressive FX Chain Prediction on Source-Separated Stems',
    'Beyond Dry References: Learning Relative Audio Effects Representations via Contrastive Distance Learning',
    'Diff2Mix: Controllable Music Mixing via Diffusion Models and Differentiable Audio Effects',
    'Smorph: Playable Sound Morphing with Diffusion Models',
  ]),
  trail('explore-musical-traditions', 'Explore musical traditions', 'A curated path across title-identified work on culturally situated repertoires, modes, archives, and analysis.', [
    'Investigating Ethiopian Kiñit in Secular Music: A Self-Supervised Learning and Computational Analysis',
    'OudTabs: An Interactive Microtonal Tablature Platform for Cross-Tradition Oud Repertoires',
    'Culture-Specific Computational Musicology in Practice: DiArMaqAr (Digital Arabic Maqām Archive)',
    'An Open Corpus for Arabic Maqam Recognition',
    'Adapting Music Foundation Models to Iranian Classical Music',
    'Frame-Level Pansori Mode Classification with Complementary Audio Representations',
  ]),
];

const suppliedPrototypeTitles = [
  'Off-Manifold Robustness in Synthesizer Inversion with Joint Distribution Flow Matching',
  'FusID: Modality-Fused Semantic IDs for Generative Music Recommendation',
  'Dual-Time Representation Framework for Interactive Music Transcription',
  'TUTTI: Toward generalizable audio-to-score transcription via fully synthesized data',
  'Streaming Generation for Music Accompaniment',
  'Learning to Sing with Your Own Voice: Designing and Evaluating Generative AI-Assisted Vocal Coaching',
  'Pitch Estimation and Vocal Melody Extraction with Self-supervised Phase Comparators',
  'MuScriptor: An Open Model for Multi-Instrument Music Transcription',
  'Explore This! Beat and Downbeat Tracking From a Learned Tatum Grid',
  'Does Notation Matter? MusicXML Tokenisation for Symbolic Music Generation and Understanding',
];
const officialTitles = new Set(papers.map((paper) => paper.title));

const sourceMetadata = {
  sourceUrl: SOURCE_URL,
  retrievedAt: RETRIEVED_AT,
  totalPapers: papers.length,
  sourceSha256: createHash('sha256').update(html).digest('hex'),
  runtimeSourceDependency: false,
  fieldsCaptured: ['title', 'authors', 'affiliations-when-reliably-separable'],
  verifiedPaperUrlsAvailable: false,
  reuseBoundary: 'No abstracts or full paper text copied. Original code is MIT-licensed; conference and paper metadata are not claimed as project-owned.',
  reconciliation: {
    suppliedMaterial: 'Ten titles visible in the supplied validated prototype screenshot; no separate machine-readable paper list was supplied.',
    suppliedTitleCount: suppliedPrototypeTitles.length,
    matchedTitleCount: suppliedPrototypeTitles.filter((title) => officialTitles.has(title)).length,
    missingFromOfficial: suppliedPrototypeTitles.filter((title) => !officialTitles.has(title)),
    changedTitles: [],
    duplicateNormalizedTitles: [],
  },
  preservedSourceNotes: [
    'The affiliation “American University of Beiru” is preserved exactly as listed on the official page.',
    'The affiliation “Universirty of Oslo” is preserved exactly as listed on the official page.',
  ],
};

await mkdir('data', { recursive: true });
const writeJson = (filename, data) => writeFile(path.join('data', filename), `${JSON.stringify(data, null, 2)}\n`);
await Promise.all([
  writeJson('papers.json', papers),
  writeJson('topics.json', topics),
  writeJson('trails.json', trails),
  writeJson('source-metadata.json', sourceMetadata),
  writeJson('source-snapshot.json', {
    sourceUrl: SOURCE_URL,
    retrievedAt: RETRIEVED_AT,
    totalPapers: sourceRecords.length,
    records: sourceRecords,
  }),
]);

console.log(`Imported ${papers.length} papers from ${SOURCE_URL}`);
