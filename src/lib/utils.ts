import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getFlagUrl = (country: string) => {
  // Normalization map to handle common variations
  const normalizedCountry = country?.trim();

  const countryMap: { [key: string]: string } = {
    "Espanha": "es", "Spain": "es",
    "Alemanha": "de", "Germany": "de",
    "França": "fr", "France": "fr",
    "Itália": "it", "Italy": "it",
    "Holanda": "nl", "Netherlands": "nl",
    "Portugal": "pt",
    "Inglaterra": "gb-eng", "England": "gb-eng",
    "Grécia": "gr", "Greece": "gr",
    "Rússia": "ru", "Russia": "ru",
    "Brasil": "br", "Brazil": "br",
    "Argentina": "ar",
    "Croácia": "hr", "Croatia": "hr",
    "República Tcheca": "cz", "Czech Republic": "cz",
    "Dinamarca": "dk", "Denmark": "dk",
    "Suécia": "se", "Sweden": "se",
    "Ucrânia": "ua", "Ukraine": "ua",
    "Polônia": "pl", "Poland": "pl",
    "Irlanda": "ie", "Ireland": "ie"
  };

  const code = countryMap[normalizedCountry];
  return code ? `https://flagcdn.com/w40/${code}.png` : "";
};
