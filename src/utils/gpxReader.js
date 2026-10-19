// Парсер GPX: достаёт name и description из <metadata>
export async function readGpxMeta(file) {
  const text = await file.text();
  const xml = new DOMParser().parseFromString(text, 'application/xml');

  if (xml.querySelector('parsererror')) {
    throw new Error('Invalid GPX/XML');
  }

  const metaName =
    xml.querySelector('metadata > name')?.textContent?.trim() ||
    xml.querySelector('trk > name')?.textContent?.trim() ||
    '';

  const metaDesc =
    xml.querySelector('metadata > desc')?.textContent?.trim() ||
    xml.querySelector('trk > desc')?.textContent?.trim() ||
    '';

  return { name: metaName, description: metaDesc };
}