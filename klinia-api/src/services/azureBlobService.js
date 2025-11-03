import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters
} from '@azure/storage-blob';
import { env } from '../config/env.js';

const connStr = env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
const containerClient = blobServiceClient.getContainerClient(
  env.AZURE_STORAGE_CONTAINER_NAME
);

// Extraer credenciales para firmar el SAS
let sharedKeyCredential;
try {
  const accountName = connStr.match(/AccountName=([^;]+)/)[1];
  const accountKey = connStr.match(/AccountKey=([^;]+)/)[1];
  sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
} catch (e) {
  console.error(
    "FATAL: No se pudo extraer AccountName/AccountKey del Connection String. Los SAS URLs fallarán."
  );
}

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
 * ¡ESTA ES LA FUNCIÓN QUE FALTABA!
 * Sube un buffer de imagen (JPG, PNG, PDF) al Blob Storage.
 * @param {Buffer} buffer - El buffer del archivo.
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

/**
 * Genera una URL temporal (SAS) para un blob privado.
 * @param {string} blobName - El nombre/ruta del archivo (ej. "auditoria/user-123/INE.pdf")
 * @returns {Promise<string>} - La URL completa con el token SAS, válida por 10 minutos.
 */
export const getBlobSasUrl = async (blobName) => {
  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + 10); // Válido por 10 minutos

  const sasOptions = {
    containerName: env.AZURE_STORAGE_CONTAINER_NAME,
    blobName: blobName,
    permissions: BlobSASPermissions.parse("r"), // "r" = Permiso de Lectura (Read)
    expiresOn: expiresOn,
  };

  const sasToken = generateBlobSASQueryParameters(
    sasOptions,
    sharedKeyCredential
  ).toString();
  
  // Devuelve la URL completa + el token
  return `${containerClient.getBlockBlobClient(blobName).url}?${sasToken}`;
};