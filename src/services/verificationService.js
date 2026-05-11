import { delay } from "./mocks/db";

const MOCK_CODE = "123456";

const sendPhoneOtp = async (phone) => {
  await delay(200);
  return { success: true, sent: true, phone, debugCode: MOCK_CODE };
};

const checkPhoneOtp = async (phone, code) => {
  await delay(200);
  if (String(code).trim() !== MOCK_CODE) {
    const err = new Error("Código incorrecto. En modo demo usa 123456.");
    err.status = 400;
    throw err;
  }
  return { success: true, verified: true, phone };
};

export default {
  sendPhoneOtp,
  checkPhoneOtp,
};
