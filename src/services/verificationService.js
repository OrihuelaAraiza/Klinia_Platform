import apiClient from './apiClient';

const sendPhoneOtp = async (phone) => {
  const response = await apiClient.post('/verify/send-phone-otp', {
    phone: phone,
  });
  return response; 
};

const checkPhoneOtp = async (phone, code) => {
  const response = await apiClient.post('/verify/check-phone-otp', {
    phone: phone,
    code: code,
  });
  return response; 
};

export default {
  sendPhoneOtp,
  checkPhoneOtp,
};