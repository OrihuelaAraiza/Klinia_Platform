// Romi SEPOMEX API — busca códigos postales mexicanos y devuelve estado,
// municipio, ciudad y lista de colonias. No requiere autenticación.
const SEPOMEX_BASE_URL =
  "https://romisepomex-e6fca9badrcneabt.canadacentral-01.azurewebsites.net";

/**
 * Consulta un código postal mexicano de 5 dígitos.
 *
 * @param {string} cp - Código postal de 5 dígitos
 * @returns {Promise<null | {
 *   postalCode: string,
 *   stateName: string,
 *   city: string,
 *   municipality: string,
 *   colonies: string[],
 *   coloniesDetailed: Array<{name: string, type?: string, zone?: string}>
 * }>}
 */
export const lookupPostalCode = async (cp) => {
  if (!cp || cp.length !== 5 || !/^\d{5}$/.test(cp)) return null;

  try {
    const res = await fetch(`${SEPOMEX_BASE_URL}/api/v1/cp/${cp}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      console.warn(`[CP] SEPOMEX devolvió ${res.status} para CP=${cp}`);
      return null;
    }
    const data = await res.json();
    if (!data?.estado) {
      console.warn("[CP] Respuesta sin estado:", data);
      return null;
    }

    const colonias = Array.isArray(data.colonias) ? data.colonias : [];
    const colonies = colonias.map((c) =>
      typeof c === "string" ? c : c.nombre
    );
    const coloniesDetailed = colonias.map((c) =>
      typeof c === "string"
        ? { name: c }
        : { name: c.nombre, type: c.tipo, zone: c.zona }
    );

    return {
      postalCode: data.codigo_postal || cp,
      stateName: data.estado,
      city: data.ciudad || data.municipio,
      municipality: data.municipio,
      colonies,
      coloniesDetailed,
    };
  } catch (error) {
    console.error("[CP] Error consultando SEPOMEX:", error);
    return null;
  }
};

export const findStateValue = (statesList, stateNameFromApi) => {
  if (!statesList || !stateNameFromApi) return "";
  const normalize = (s) =>
    String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim();
  const search = normalize(stateNameFromApi);
  const found = statesList.find(
    (s) => normalize(s.label) === search || normalize(s.value) === search
  );
  return found ? found.value : "";
};
