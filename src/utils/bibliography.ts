import type { BibliographyReference } from '../types';

export function formatReferenceAPA(ref: BibliographyReference): string {
  switch (ref.type) {
    case 'article': {
      let text = `${ref.authors} (${ref.year}). ${ref.title}.`;
      if (ref.journal) text += ` <em>${ref.journal}</em>`;
      if (ref.volume) text += `, <em>${ref.volume}</em>`;
      if (ref.issue) text += `(${ref.issue})`;
      if (ref.pages) text += `, ${ref.pages}`;
      text += '.';
      if (ref.doi) text += ` https://doi.org/${ref.doi}`;
      return text;
    }
    case 'book': {
      let text = `${ref.authors} (${ref.year}). <em>${ref.title}</em>.`;
      if (ref.city && ref.publisher) text += ` ${ref.city}: ${ref.publisher}.`;
      else if (ref.publisher) text += ` ${ref.publisher}.`;
      return text;
    }
    case 'chapter': {
      let text = `${ref.authors} (${ref.year}). ${ref.title}.`;
      if (ref.editors) text += ` En ${ref.editors} (Ed.),`;
      text += ` <em>${ref.title}</em>`;
      if (ref.pages) text += ` (pp. ${ref.pages})`;
      text += '.';
      if (ref.city && ref.publisher) text += ` ${ref.city}: ${ref.publisher}.`;
      return text;
    }
    case 'website': {
      let text = `${ref.authors} (${ref.year}). ${ref.title}.`;
      if (ref.url) text += ` Recuperado de ${ref.url}`;
      return text;
    }
    case 'thesis': {
      let text = `${ref.authors} (${ref.year}). <em>${ref.title}</em> [Tesis doctoral].`;
      if (ref.publisher) text += ` ${ref.publisher}.`;
      return text;
    }
    case 'conference': {
      let text = `${ref.authors} (${ref.year}). ${ref.title}.`;
      if (ref.journal) text += ` Presentado en ${ref.journal}`;
      if (ref.city) text += `, ${ref.city}`;
      text += '.';
      return text;
    }
    default:
      return `${ref.authors} (${ref.year}). ${ref.title}.`;
  }
}

export function formatReferenceVancouver(ref: BibliographyReference, index: number): string {
  switch (ref.type) {
    case 'article': {
      let text = `${index}. ${ref.authors}. ${ref.title}.`;
      if (ref.journal) text += ` ${ref.journal}.`;
      text += ` ${ref.year}`;
      if (ref.volume) text += `;${ref.volume}`;
      if (ref.issue) text += `(${ref.issue})`;
      if (ref.pages) text += `:${ref.pages}`;
      text += '.';
      if (ref.doi) text += ` doi:${ref.doi}`;
      return text;
    }
    case 'book': {
      let text = `${index}. ${ref.authors}. ${ref.title}.`;
      if (ref.edition) text += ` ${ref.edition} ed.`;
      if (ref.city) text += ` ${ref.city}:`;
      if (ref.publisher) text += ` ${ref.publisher};`;
      text += ` ${ref.year}.`;
      return text;
    }
    case 'website': {
      let text = `${index}. ${ref.authors}. ${ref.title} [Internet].`;
      text += ` ${ref.year}`;
      if (ref.accessDate) text += ` [citado ${ref.accessDate}]`;
      text += '.';
      if (ref.url) text += ` Disponible en: ${ref.url}`;
      return text;
    }
    default:
      return `${index}. ${ref.authors}. ${ref.title}. ${ref.year}.`;
  }
}

export function formatReference(ref: BibliographyReference, index: number): string {
  if (ref.style === 'vancouver') {
    return formatReferenceVancouver(ref, index);
  }
  return formatReferenceAPA(ref);
}

export function generateInTextCitation(ref: BibliographyReference, index: number): string {
  if (ref.style === 'vancouver') {
    return `(${index})`;
  }
  const authorLastName = ref.authors.split(',')[0].split(' ').pop() || ref.authors;
  return `(${authorLastName}, ${ref.year})`;
}
