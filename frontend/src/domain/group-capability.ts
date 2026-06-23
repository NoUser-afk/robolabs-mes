export function isGroupCapableText(text: string) {
  const value = text.toLowerCase();
  return value.includes('лазер') || value.includes('зачист') || value.includes('пробив') || value.includes('координат');
}
