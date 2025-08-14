'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form, Input, Button, Alert, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'

interface LoginFormProps {
  onLogin: () => void
}

interface LoginFormData {
  username: string
  password: string
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const [form] = Form.useForm()

  const handleSubmit = async (values: LoginFormData) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('token', data.token)
        message.success('Đăng nhập thành công!')
        onLogin()
        router.push('/dashboard')
      } else {
        setError(data.message || 'Đăng nhập thất bại')
      }
    } catch (error) {
      setError('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          className="mb-4"
          closable
          onClose={() => setError('')}
        />
      )}
      
      <Form
        form={form}
        name="login"
        onFinish={handleSubmit}
        layout="vertical"
        size="large"
        initialValues={{
          username: '',
          password: ''
        }}
      >
        <Form.Item
          name="username"
          rules={[
            { required: true, message: 'Vui lòng nhập tên đăng nhập!' }
          ]}
        >
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            placeholder="Tên đăng nhập"
            className="rounded-lg"
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu!' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="Mật khẩu"
            className="rounded-lg"
          />
        </Form.Item>

        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="w-full h-12 rounded-lg text-base font-medium"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </Form.Item>
      </Form>

      <div className="mt-4 text-center space-y-2">
        <p className="text-sm text-gray-500">
          Chưa có tài khoản?{' '}
          <a href="/register" className="text-blue-600 hover:text-blue-800 font-medium">
            Đăng ký ngay
          </a>
        </p>
      </div>
    </div>
  )
}
