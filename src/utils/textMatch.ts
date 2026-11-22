// Normaliza texto para comparar: sin tildes, minúsculas, sin espacios extra.
export const normalizeText = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// ¿El texto de un campo (origen/destino real, escrito a mano por el
// conductor) coincide con lo que el pasajero buscó? Antes se exigía la frase
// completa, en el mismo orden, como substring exacto -- "Puerto Tejada" no
// encontraba "Tejada Puerto" ni una búsqueda de una sola palabra como
// "Tejada". Ahora se parte la búsqueda en palabras sueltas y basta con que
// TODAS aparezcan en el campo, en cualquier orden. Sigue siendo comparación
// de texto literal (no geocodifica direcciones ni barrios), solo más
// tolerante a cómo el usuario escribe la búsqueda.
export const matchesQuery = (fieldText: string, query: string): boolean => {
  const q = normalizeText(query)
  if (!q) return true
  const field = normalizeText(fieldText)
  const words = q.split(/\s+/).filter(Boolean)
  return words.every((w) => field.includes(w))
}
