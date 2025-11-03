import { BlobServiceClient } from '@azure/storage-blob';
import { env } from '../config/env.js';

const blobServiceClient = BlobServiceClient.fromConnectionString(
  env.AZURE_STORAGE_CONNECTION_STRING
);
const containerClient = blobServiceClient.getContainerClient(
  env.AZURE_STORAGE_CONTAINER_NAME
);

/**
 * Sube un objeto JSON como un archivo de texto/json al Blob Storage.
 * @param {string} blobName - El nombre/ruta del archivo (ej. "usuario-123/resultado-ine.json")
 * @param {object} data - El objeto JSON que se va a guardar.
 * @returns {Promise<string>} - La URL del blob guardado.
 */
export const uploadJsonLog = async (blobName, data) => {
  try {
    const dataString = JSON.stringify(data, null, 2);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.upload(dataString, dataString.length, {
      blobHTTPHeaders: { blobContentType: 'application/json; charset=utf-8' },
    });
    console.log(`Log JSON guardado en: ${blobName}`);
    return blockBlobClient.url;
  } catch (error) {
    console.error('Error al subir el log JSON al blob:', error);
    throw error;
  }
};

/**
 * Sube un buffer de imagen (JPG, PNG) al Blob Storage.
 * @param {Buffer} buffer - El buffer del archivo de imagen.
 * @param {string} blobName - El nombre/ruta del archivo (ej. "usuario-123/selfie.jpg")
 * @param {string} mimeType - El mimetype del archivo (ej. "image/jpeg")
 * @returns {Promise<string>} - La URL del blob guardado.
 */
export const uploadImageBuffer = async (buffer, blobName, mimeType) => {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: { blobContentType: mimeType },
    });
    console.log(`Imagen guardada en: ${blobName}`);
    return blockBlobClient.url;
  } catch (error) {
    console.error('Error al subir imagen al blob:', error);
    throw error;
  }
};