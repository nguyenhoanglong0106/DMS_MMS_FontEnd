import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Trả thẳng response.data để nơi gọi API không phải destructure lại,
// và gom lỗi về 1 Error có message dễ hiểu để hiển thị cho người dùng.
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Không kết nối được API'

    return Promise.reject(new Error(message))
  }
)

export default apiClient
