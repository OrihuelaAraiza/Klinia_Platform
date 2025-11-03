import { FaceClient } from '@azure/cognitiveservices-face';
import { CognitiveServicesCredentials } from '@azure/ms-rest-azure-js';
import { env } from '../config/env.js';

const credentials = new CognitiveServicesCredentials(env.AZURE_FACE_KEY);
const client = new FaceClient(credentials, env.AZURE_FACE_ENDPOINT);

/**
 * Detecta un rostro en una imagen de una URL y devuelve el faceId.
 * @param {string} imageUrl La URL de la imagen (selfie o documento)
 * @returns {Promise<string>} El faceId detectado.
 */
export const detectFace = async (imageUrl) => {
  try {
    const detectedFaces = await client.face.detectWithUrl(imageUrl, {
      recognitionModel: 'recognition_04',
      detectionModel: 'detection_03',
      returnFaceId: true,
    });

    if (!detectedFaces || detectedFaces.length === 0) {
      throw new Error('No se detectó ningún rostro en la imagen.');
    }
    // Devolvemos el ID del primer rostro encontrado
    return detectedFaces[0].faceId;
  } catch (error) {
    console.error('Error en Detección Facial:', error);
    throw error;
  }
};

/**
 * Compara dos faceIds y devuelve el resultado de la verificación.
 * @param {string} faceId1 ID del primer rostro
 * @param {string} faceId2 ID del segundo rostro
 * @returns {Promise<object>} Objeto con { isIdentical, confidence }
 */
export const verifyFaces = async (faceId1, faceId2) => {
  try {
    const result = await client.face.verifyFaceToFace(faceId1, faceId2);
    return result;
  } catch (error) {
    console.error('Error en Verificación Facial:', error);
    throw error;
  }
};