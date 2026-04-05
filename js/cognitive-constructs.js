/**
 * Maps each game to psychologically named constructs and classic references.
 * Copy is educational only — these tasks are not normed clinical instruments.
 */

/** @typedef {{ id: string, label: string, blurb: string, cite: string }} CognitiveConstruct */

/** @type {Record<string, CognitiveConstruct>} */
export const CONSTRUCTS = {
  "change-detection": {
    id: "change-detection",
    label: "Visual change detection",
    blurb:
      "Detecting what changed between two displays taps visual short-term storage and comparison processes.",
    cite: "Luck, S. J., & Vogel, E. K. (1997). The capacity of visual working memory for features and conjunctions. Nature, 390(6657), 279–281.",
  },
  "spatial-binding": {
    id: "spatial-binding",
    label: "Object–location binding",
    blurb:
      "Remembering which object appeared where requires binding features to locations in working memory.",
    cite: "Olson, I. R., et al. (2006). The perceptual representation of items in visual working memory. Psychonomic Bulletin & Review, 13(5), 855–859.",
  },
  "visuospatial-stm": {
    id: "visuospatial-stm",
    label: "Visuospatial short-term memory",
    blurb:
      "Holding a spatial pattern across a gap is central to the visuospatial sketchpad component of working memory.",
    cite: "Baddeley, A. D. (1986). Working memory. Oxford University Press.",
  },
  "sequence-wm": {
    id: "sequence-wm",
    label: "Serial order in working memory",
    blurb:
      "Repeating a sequence in order stresses memory for serial order, a core constraint in working-memory models.",
    cite: "Hurlstone, M. J., et al. (2014). The unified model of serial order (UMSO): A framework for remembering sequences. Psychological Review, 121(3), 389–422.",
  },
  "wm-updating": {
    id: "wm-updating",
    label: "Working-memory updating",
    blurb:
      "N-back and continuous-match tasks require updating and monitoring representations over time.",
    cite: "Jaeggi, S. M., et al. (2008). Improving fluid intelligence with training on working memory. PNAS, 105(19), 6829–6833.",
  },
  "reversal-transform": {
    id: "reversal-transform",
    label: "Order transformation / manipulation",
    blurb:
      "Reversing a sequence adds manipulation demands beyond simple storage (related to mental reordering).",
    cite: "Baddeley, A. D., & Hitch, G. (1974). Working memory. In G. H. Bower (Ed.), Psychology of learning and motivation (Vol. 8). Academic Press.",
  },
  "paired-association": {
    id: "paired-association",
    label: "Paired-associate learning",
    blurb:
      "Learning which stimuli belong together is a classic associative memory paradigm.",
    cite: "Kausler, D. H. (1994). Learning and memory in normal aging. Academic Press.",
  },
  "spatial-sequence": {
    id: "spatial-sequence",
    label: "Spatial sequence memory",
    blurb:
      "Remembering a path over a grid combines spatial and sequential memory.",
    cite: "Hartley, T., et al. (2003). The well-worn route: The hippocampus and path integration. Trends in Neurosciences, 26(7), 381–384.",
  },
  "visual-search-enumeration": {
    id: "visual-search-enumeration",
    label: "Visual search & ordered enumeration",
    blurb:
      "Finding items in a fixed order combines visual search with controlled counting-like updating.",
    cite: "Treisman, A., & Gelade, G. (1980). A feature-integration theory of attention. Cognitive Psychology, 12(1), 97–136.",
  },
  "interference-control": {
    id: "interference-control",
    label: "Selective attention / interference control",
    blurb:
      "Stroop-type tasks measure the ability to respond to one dimension while ignoring a conflicting one.",
    cite: "MacLeod, C. M. (1991). Half a century of research on the Stroop effect: An integrative review. Psychological Bulletin, 109(2), 163–203.",
  },
  "processing-speed": {
    id: "processing-speed",
    label: "Processing speed & simple RT",
    blurb:
      "Simple reaction time tasks isolate motor readiness and speed of responding to a predictable stimulus.",
    cite: "Jensen, A. R. (2006). Clocking the mind: Mental chronometry and individual differences. Elsevier.",
  },
  "impulse-control": {
    id: "impulse-control",
    label: "Response inhibition (impulse control)",
    blurb:
      "Withholding a prepotent response until a go signal is a hallmark of inhibitory control paradigms.",
    cite: "Logan, G. D., & Cowan, W. B. (1984). On the ability to inhibit thought and action: A theory of an act of control. Psychological Review, 91(3), 295–327.",
  },
  "sustained-attention": {
    id: "sustained-attention",
    label: "Sustained attention / monitoring",
    blurb:
      "Counting rare events in a stream stresses vigilance and sustained monitoring.",
    cite: "Robertson, I. H., et al. (1997). ‘Oops!’: Performance correlates of everyday attentional failures in traumatic brain injured and normal subjects. Neuropsychologia, 35(6), 747–758.",
  },
};

/** Which constructs each mini-game is meant to illustrate (primary first). */
export const GAME_CONSTRUCT_IDS = {
  "cognitive-snapshot": [
    "change-detection",
    "visuospatial-stm",
    "paired-association",
    "visual-search-enumeration",
  ],
  "chess-glance": ["change-detection", "visuospatial-stm"],
  "piece-recall": ["spatial-binding", "visuospatial-stm"],
  "pattern-grid": ["visuospatial-stm"],
  "sequence-echo": ["sequence-wm"],
  "pair-recall": ["paired-association"],
  "path-memory": ["spatial-sequence", "sequence-wm"],
  "number-sweep": ["visual-search-enumeration", "processing-speed"],
  "color-word-clash": ["interference-control"],
};

/**
 * @param {string} slug
 * @returns {CognitiveConstruct[]}
 */
export function constructsForGame(slug) {
  const ids = GAME_CONSTRUCT_IDS[slug] ?? [];
  return ids.map((id) => CONSTRUCTS[id]).filter(Boolean);
}

export const RESEARCH_DISCLAIMER =
  "These summaries link each task to established cognitive constructs for learning. " +
  "Scores are not clinical or normed like standardized tests; confounds include fatigue, device lag, and practice.";
