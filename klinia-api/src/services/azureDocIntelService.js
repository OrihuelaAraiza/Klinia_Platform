import {
  DocumentAnalysisClient,
  AzureKeyCredential,
} from '@azure/ai-form-recognizer';
import { env } from '../config/env.js';

const client = new DocumentAnalysisClient(
  env.AZURE_DOCINTEL_ENDPOINT,
  new AzureKeyCredential(env.AZURE_DOCINTEL_KEY)
);

/**
 * Extrae datos de un Documento de Identidad (INE/Pasaporte)
 * usando una URL SAS.
 */
export const analyzeIdDocument = async (documentUrl) => {
  try {
    const poller = await client.beginAnalyzeDocument(
      'prebuilt-idDocument',
      documentUrl
    );
    const { documents } = await poller.pollUntilDone();
    const idDocument = documents[0];

    if (!idDocument) {
      throw new Error('No se pudo extraer ningún documento de identidad.');
    }

    console.log('Documento extraído:', idDocument.docType);
    return idDocument;
  } catch (error) {
    console.error('Error en el servicio de Document Intelligence (ID):', error);
    throw error;
  }
};

/**
 * Extrae todo el texto de un documento (ideal para CURP).
 * @param {string} documentUrl - La URL SAS del documento a analizar.
 * @returns {Promise<object>} - El resultado del análisis (ej. { content: "..." })
 */
export const analyzeDocumentLayout = async (documentUrl) => {
  try {
    const poller = await client.beginAnalyzeDocument(
      'prebuilt-layout',
      documentUrl
    );
    
    const result = await poller.pollUntilDone();
    
    if (!result.content) {
      throw new Error('No se pudo extraer contenido del documento.');
    }
    
    console.log('Layout extraído, longitud:', result.content.length);
    return result; //
  } catch (error) {
    console.error('Error en el servicio de Document Intelligence (Layout):', error);
    throw error;
  }
};