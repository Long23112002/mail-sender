'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Typography, Space, Form, Input, Button, Alert, message } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined } from '@ant-design/icons'
import Link from 'next/link'

const { Title, Text } = Typography

interface RegisterFormData {
  username: string
  email: string
  password: string
  confirmPassword: string
  fullName: string
}

export default function Register() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const [form] = Form.useForm()

  const handleSubmit = async (values: RegisterFormData) => {
    if (values.password !== values.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          password: values.password,
          fullName: values.fullName
        }),
      })

      const data = await response.json()

      if (response.ok) {
        message.success('Đăng ký thành công! Vui lòng đăng nhập.')
        router.push('/')
      } else {
        setError(data.message || 'Đăng ký thất bại')
      }
    } catch (error) {
      setError('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

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
              <div className="bg-green-500 p-4 rounded-full">
                <UserOutlined className="text-3xl text-white" />
              </div>
            </div>
            
            {/* Header */}
            <div>
              <Title level={2} className="!mb-2">
                Đăng ký
              </Title>
              <Text type="secondary" className="text-base">
                Tạo tài khoản Email Sender
              </Text>
            </div>
            
            {/* Register Form */}
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
                name="register"
                onFinish={handleSubmit}
                layout="vertical"
                size="large"
              >
                <Form.Item
                  name="fullName"
                  rules={[
                    { required: true, message: 'Vui lòng nhập họ tên!' },
                    { max: 100, message: 'Họ tên không được quá 100 ký tự!' }
                  ]}
                >
                  <Input
                    prefix={<IdcardOutlined className="text-gray-400" />}
                    placeholder="Họ và tên"
                    className="rounded-lg"
                  />
                </Form.Item>

                <Form.Item
                  name="username"
                  rules={[
                    { required: true, message: 'Vui lòng nhập tên đăng nhập!' },
                    { min: 3, message: 'Tên đăng nhập phải có ít nhất 3 ký tự!' },
                    { max: 50, message: 'Tên đăng nhập không được quá 50 ký tự!' }
                  ]}
                >
                  <Input
                    prefix={<UserOutlined className="text-gray-400" />}
                    placeholder="Tên đăng nhập"
                    className="rounded-lg"
                  />
                </Form.Item>

                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email!' },
                    { type: 'email', message: 'Email không hợp lệ!' }
                  ]}
                >
                  <Input
                    prefix={<MailOutlined className="text-gray-400" />}
                    placeholder="Email"
                    className="rounded-lg"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mật khẩu!' },
                    { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-gray-400" />}
                    placeholder="Mật khẩu"
                    className="rounded-lg"
                  />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  rules={[
                    { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve()
                        }
                        return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'))
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-gray-400" />}
                    placeholder="Xác nhận mật khẩu"
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
                    {loading ? 'Đang đăng ký...' : 'Đăng ký'}
                  </Button>
                </Form.Item>
              </Form>

              <div className="mt-4 text-center">
                <Text type="secondary" className="text-sm">
                  Đã có tài khoản?{' '}
                  <Link href="/" className="text-blue-600 hover:text-blue-800">
                    Đăng nhập ngay
                  </Link>
                </Text>
              </div>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  )
}
