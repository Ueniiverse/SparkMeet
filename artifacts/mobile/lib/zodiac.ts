export interface ZodiacInfo {
  sign: string;
  symbol: string;
  element: string;
  description: string;
}

export function getZodiacInfo(day: number, month: number): ZodiacInfo {
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return { sign: 'Steinbock', symbol: 'V', element: 'Erde', description: 'Ehrgeizig, diszipliniert, verantwortungsbewusst' };
  }
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
    return { sign: 'Wassermann', symbol: 'W', element: 'Luft', description: 'Innovativ, unabhängig, humanistisch' };
  }
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
    return { sign: 'Fische', symbol: 'H', element: 'Wasser', description: 'Einfühlsam, kreativ, intuitiv' };
  }
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
    return { sign: 'Widder', symbol: 'A', element: 'Feuer', description: 'Mutig, energiegeladen, spontan' };
  }
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
    return { sign: 'Stier', symbol: 'B', element: 'Erde', description: 'Geduldig, zuverlässig, genussorientiert' };
  }
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
    return { sign: 'Zwillinge', symbol: 'C', element: 'Luft', description: 'Vielseitig, kommunikativ, neugierig' };
  }
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
    return { sign: 'Krebs', symbol: 'D', element: 'Wasser', description: 'Fürsorglich, intuitiv, emotional' };
  }
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    return { sign: 'Löwe', symbol: 'E', element: 'Feuer', description: 'Charismatisch, großzügig, selbstbewusst' };
  }
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
    return { sign: 'Jungfrau', symbol: 'F', element: 'Erde', description: 'Analytisch, fleißig, perfektionistisch' };
  }
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
    return { sign: 'Waage', symbol: 'G', element: 'Luft', description: 'Ausgeglichen, charmant, gerechtigkeitsliebend' };
  }
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
    return { sign: 'Skorpion', symbol: 'I', element: 'Wasser', description: 'Leidenschaftlich, tiefgründig, entschlossen' };
  }
  return { sign: 'Schütze', symbol: 'J', element: 'Feuer', description: 'Optimistisch, abenteuerlustig, philosophisch' };
}

const ELEMENT_COLORS: Record<string, string> = {
  Feuer: '#FF6B4A',
  Erde: '#8BC34A',
  Luft: '#29B6F6',
  Wasser: '#7C6FFF',
};

export function getElementColor(element: string): string {
  return ELEMENT_COLORS[element] ?? '#7C6FFF';
}

const SIGN_TO_ELEMENT: Record<string, string> = {
  Widder: 'Feuer', Löwe: 'Feuer', Schütze: 'Feuer',
  Stier: 'Erde', Jungfrau: 'Erde', Steinbock: 'Erde',
  Zwillinge: 'Luft', Waage: 'Luft', Wassermann: 'Luft',
  Krebs: 'Wasser', Skorpion: 'Wasser', Fische: 'Wasser',
};

export function getZodiacColorBySign(sign: string): string {
  const element = SIGN_TO_ELEMENT[sign];
  return element ? getElementColor(element) : '#7C6FFF';
}

export function calculateAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
