export const ORIGINAL_CONCEPTS = [
  { id: 'editorial', name: 'Quiet editorial', description: 'Warm paper, oversized serif type and an unhurried, asymmetric gallery.' },
  { id: 'index', name: 'Electric index', description: 'Cobalt blue, crisp typography and a graphic, tightly arranged photo grid.' },
  { id: 'cinematic', name: 'After hours', description: 'Deep charcoal, a full-bleed opening photograph and cinematic typography.' },
  { id: 'contact', name: 'Contact sheet', description: 'A vermilion accent, warm paper and photographs arranged like loose prints.' },
  { id: 'archive', name: 'Colour archive', description: 'Physical folder tabs, lilac paper and a playful coral accent.' },
  { id: 'atelier', name: 'Soft atelier', description: 'Sage green, elegant serif type and generous space around the photographs.' },
] as const;

export const BLEND_CONCEPTS = [
  { id: 'moonlit', name: 'Moonlit archive', description: 'A cinematic photo backdrop, a dark plum gallery and lilac folder tabs. Cream paper frames only for film.' },
  { id: 'sunset', name: 'Peach scrapbook', description: 'A peach-and-coral palette, an inset photograph and playful folder tabs. Film prints sit among unframed digital images.' },
  { id: 'lavender', name: 'Lavender daydream', description: 'A split photographic opening with lilac paper, coral lettering and straight cream-framed film prints.' },
  { id: 'mint', name: 'Mint afterglow', description: 'An immersive photographic opening, soft mint folders and a spacious gallery with subtle cream film frames.' },
] as const;

export const NAVIGATION_CONCEPTS = [
  { id: 'pills', name: 'Soft capsules', description: 'Rounded category buttons below a photographic opening. On film keeps its peach capsule in either theme.' },
  { id: 'underline', name: 'Quiet links', description: 'Clean text navigation with an underline for the selection and a peach badge for On film.' },
  { id: 'dock', name: 'Floating palette', description: 'A softly translucent navigation dock over the photograph, with a peach On film button.' },
  { id: 'rail', name: 'Studio sidebar', description: 'A vertical collection menu beside the photographs. On film stands out as a peach label.' },
] as const;

export const CONCEPTS = [...NAVIGATION_CONCEPTS, ...BLEND_CONCEPTS, ...ORIGINAL_CONCEPTS];
export type OriginalConceptId = typeof ORIGINAL_CONCEPTS[number]['id'];
export type BlendConceptId = typeof BLEND_CONCEPTS[number]['id'];
export type NavigationConceptId = typeof NAVIGATION_CONCEPTS[number]['id'];
export type ConceptId = typeof CONCEPTS[number]['id'];

export function isBlendConcept(id: ConceptId): id is BlendConceptId {
  return BLEND_CONCEPTS.some((concept) => concept.id === id);
}

export function isNavigationConcept(id: ConceptId): id is NavigationConceptId {
  return NAVIGATION_CONCEPTS.some((concept) => concept.id === id);
}

export function findConcept(id: string | null) {
  return CONCEPTS.find((concept) => concept.id === id);
}

export function conceptUrl(id?: ConceptId) {
  return `${import.meta.env.BASE_URL}?${id ? `design=${id}` : 'designs'}`;
}
