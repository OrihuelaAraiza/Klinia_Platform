import { api } from "../services/apiClient";

export const lookupPostalCode = async (cp) => {
  if (!cp || cp.length !== 5) return null;

  try {
    const response = await api.get(`/utils/consulta-cp/${cp}`, { auth: true });
    
    if (!response || !response.codigo_postal) return null;

    const info = response.codigo_postal;

    // Log para depuración: verifica esto en la consola del navegador
    console.log("Datos recibidos de la API:", info);

    return {
      stateName: info.estado,
      city: info.municipio,
      postalCode: info.codigo_postal,
      // Validamos que sea un array antes de enviarlo al componente
      colonies: Array.isArray(info.colonias) ? info.colonias : [] 
    };
  } catch (error) {
    console.error("Error en lookupPostalCode:", error);
    return null;
  }
};

export const findStateValue = (statesList, stateNameFromApi) => {
  if (!statesList || !stateNameFromApi) return "";
  const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const search = normalize(stateNameFromApi);
  const found = statesList.find(s => normalize(s.label) === search);
  return found ? found.value : "";
};