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
 * usando una URL de un archivo (que ya debe estar en Blob Storage).
 * @param {string} documentUrl - La URL pública o SAS del documento a analizar.
 * @returns {Promise<object>} - El resultado del análisis.
 */
export const analyzeIdDocument = async (documentUrl) => {
  try {
    const poller = await client.beginAnalyzeDocument(
      'prebuilt-idDocument', // modelo clave para INE/Pasaporte
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
    console.error('Error en el servicio de Document Intelligence:', error);
    throw error;
  }
};

/**
 * Extrae datos de un Comprobante de Domicilio (ej. CFE, Telmex)
 * @param {string} documentUrl 
 * @returns {Promise<object>} 
 */
export const analyzeInvoice = async (documentUrl) => {
  try {
    const poller = await client.beginAnalyzeDocument(
      'prebuilt-invoice', // Modelo de Facturas 
      documentUrl
    );

    const { documents } = await poller.pollUntilDone();
    const invoice = documents[0];

    if (!invoice) {
      throw new Error('No se pudo extraer ninguna factura.');
    }

    console.log('Factura extraída:', invoice.docType);
    return invoice;
  } catch (error) {
    console.error('Error en el servicio de Document Intelligence:', error);
    throw error;
  }
};

