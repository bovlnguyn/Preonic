// Helper format tiền tệ VNĐ dùng chung trong toàn app
export const formatMoney = (value) => {
  const num = Number(value) || 0;
  return num.toLocaleString('vi-VN') + ' ₫';
};

// Có thể bổ sung thêm các hook fetch data dùng chung tại đây sau này
const useApiData = { formatMoney };

export default useApiData;
