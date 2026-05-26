import { api } from "./apiClient";

async function sendPhoneOtp(phone) {
  return api.post("/verify/send-phone-otp", { phone });
}

async function checkPhoneOtp(phone, code) {
  return api.post("/verify/check-phone-otp", { phone, code });
}

export default {
  sendPhoneOtp,
  checkPhoneOtp,
};
