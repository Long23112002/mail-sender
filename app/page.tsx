'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Typography, Space } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import LoginForm from './components/LoginForm'

const { Title, Text } = Typography

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setIsAuthenticated(true)
      router.push('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card 
          className="shadow-2xl border-0"
          styles={{ body: { padding: '32px' } }}
        >
          <Space direction="vertical" size="large" className="w-full text-center">
            {/* Logo/Icon */}
            <div className="flex justify-center">
              <div className="bg-blue-500 p-4 rounded-full">
                <MailOutlined className="text-3xl text-white" />
              </div>
            </div>
            
            {/* Header */}
            <div>
              <Title level={2} className="!mb-2">
                Đăng nhập
              </Title>
              <Text type="secondary" className="text-base">
                Email Application
              </Text>
            </div>
            
            {/* Login Form */}
            <LoginForm onLogin={() => setIsAuthenticated(true)} />
          </Space>
        </Card>
      </div>
    </div>
  )
}
