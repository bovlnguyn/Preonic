import { formatMoney } from '../utils/dashboard';

// Giữ API cũ cho các màn Admin, nhưng dùng chung một formatter tiền tệ toàn hệ thống.
export { formatMoney };

const useApiData = { formatMoney };

export default useApiData;
