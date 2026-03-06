import { api } from "../services/apiClient";

export const lookupPostalCode = async (cp) => {
  if (!cp || cp.length !== 5) return null;

  try {
    const response = await api.get(`/utils/consulta-cp/${cp}`, { auth: false });
    
    // Verificación de seguridad: si no hay estado, algo salió mal
    if (!response || !response.estado) {
        console.warn("La API no devolvió el formato esperado:", response);
        return null;
    }

    return {
      stateName: response.estado, // Antes buscabas info.estado
      city: response.municipio,   // Antes buscabas info.municipio
      postalCode: cp,
      // Mapeamos las colonias: si vienen como objetos {nombre: "..."} extraemos solo el string
      colonies: Array.isArray(response.colonias) 
        ? response.colonias.map(c => typeof c === 'string' ? c : c.nombre)
        : [] 
    };
  } catch (error) {
    console.error("Error en lookupPostalCode:", error);
    return null;
  }
};

export const findStateValue = (statesList, stateNameFromApi) => {
  if (!statesList || !stateNameFromApi) return "";
  
  // Normalización para ignorar acentos y mayúsculas (Ej: "Puebla" -> "puebla")
  const normalize = (s) => 
    String(s).toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const search = normalize(stateNameFromApi);
  
  // Buscamos en la lista de constantes (MEXICAN_STATES)
  const found = statesList.find(s => normalize(s.label) === search || normalize(s.value) === search);
  
  return found ? found.value : "";
};
