interface ApiResponse<T = any> {
  data?: T
  message?: string
  error?: string
}

class ApiClient {
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (value: any) => void
    reject: (reason: any) => void
  }> = []

     private processQueue(error: any, token: string | null = null) {
     console.log(`🔄 Processing queue: ${this.failedQueue.length} pending requests`)
     this.failedQueue.forEach(({ resolve, reject }) => {
       if (error) {
         reject(error)
       } else {
         resolve(token)
       }
     })
     this.failedQueue = []
   }

     private async refreshToken(): Promise<string | null> {
     const refreshToken = localStorage.getItem('refreshToken')
     if (!refreshToken) {
       console.log('❌ No refresh token available')
       return null
     }

     console.log('🔄 Attempting to refresh token...')
     try {
       const response = await fetch('/api/auth/refresh', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ refreshToken }),
       })

       if (!response.ok) {
         throw new Error('Failed to refresh token')
       }

       const data = await response.json()
       console.log('✅ Token refreshed successfully')
       
       // Lưu token mới
       localStorage.setItem('token', data.token)
       localStorage.setItem('refreshToken', data.refreshToken)
       
       return data.token
     } catch (error) {
       console.error('❌ Refresh token failed:', error)
       // Xóa token cũ nếu refresh thất bại
       localStorage.removeItem('token')
       localStorage.removeItem('refreshToken')
       return null
     }
   }

  async request<T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    let token = localStorage.getItem('token')
    
    if (!token) {
      throw new Error('No token available')
    }

    // Thêm Authorization header
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${token}`,
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // Nếu response thành công, trả về data
      if (response.ok) {
        const data = await response.json()
        return { data }
      }

             // Nếu response 401 (Unauthorized), thử refresh token
       if (response.status === 401) {
         console.log('🚨 Token expired (401), attempting refresh...')
         
         // Nếu đang refresh, đợi
         if (this.isRefreshing) {
           console.log('⏳ Another refresh in progress, waiting...')
           return new Promise((resolve, reject) => {
             this.failedQueue.push({ resolve, reject })
           })
         }

         this.isRefreshing = true

         try {
           const newToken = await this.refreshToken()
           
           if (newToken) {
             console.log('🔄 Retrying original request with new token...')
             // Thử lại request với token mới
             const retryResponse = await fetch(url, {
               ...options,
               headers: {
                 ...headers,
                 Authorization: `Bearer ${newToken}`,
               },
             })

             if (retryResponse.ok) {
               const data = await retryResponse.json()
               console.log('✅ Request retry successful')
               this.processQueue(null, newToken)
               return { data }
             } else {
               const errorData = await retryResponse.json()
               console.log('❌ Request retry failed:', errorData.message)
               this.processQueue(new Error(errorData.message || 'Request failed'))
               throw new Error(errorData.message || 'Request failed')
             }
           } else {
             // Refresh token thất bại, redirect về login
             console.log('❌ Refresh failed, redirecting to login...')
             this.processQueue(new Error('Authentication failed'))
             window.location.href = '/'
             throw new Error('Authentication failed')
           }
         } finally {
           this.isRefreshing = false
         }
       }

      // Xử lý các lỗi khác
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Helper methods cho các HTTP methods phổ biến
  async get<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>(url, { method: 'GET' })
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>(url, { method: 'DELETE' })
  }

  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
}

export const apiClient = new ApiClient()
export default apiClient
