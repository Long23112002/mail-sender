'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  List,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Popconfirm,
  message,
  Typography,
  Tag,
  Alert
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GoogleOutlined,
  MailOutlined,
  CheckCircleOutlined,
  SettingOutlined
} from '@ant-design/icons'

const { Text } = Typography

interface EmailConfig {
  _id: string
  provider: 'gmail' | 'outlook'
  email: string
  displayName: string
  isDefault: boolean
  isActive: boolean
}

interface EmailConfigManagerProps {
  onConfigChange?: () => void
}

export default function EmailConfigManager({ onConfigChange }: EmailConfigManagerProps) {
  const [configs, setConfigs] = useState<EmailConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<EmailConfig | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/email-config', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setConfigs(data.configs)
      } else {
        message.error('Không thể tải danh sách cấu hình email')
      }
    } catch (error) {
      message.error('Có lỗi xảy ra khi tải cấu hình email')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async (values: any) => {
    try {
      const token = localStorage.getItem('token')
      const url = editingConfig
        ? `/api/email-config/${editingConfig._id}`
        : '/api/email-config'

      const method = editingConfig ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        message.success(editingConfig ? 'Cập nhật cấu hình thành công' : 'Thêm cấu hình thành công')
        setModalOpen(false)
        setEditingConfig(null)
        form.resetFields()
        fetchConfigs()
        onConfigChange?.()
      } else {
        const data = await response.json()
        message.error(data.message || 'Có lỗi xảy ra')
      }
    } catch (error) {
      message.error('Có lỗi xảy ra khi lưu cấu hình')
    }
  }

  const handleDeleteConfig = async (configId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/email-config/${configId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        message.success('Xóa cấu hình thành công')
        fetchConfigs()
        onConfigChange?.()
      } else {
        const data = await response.json()
        message.error(data.message || 'Có lỗi xảy ra')
      }
    } catch (error) {
      message.error('Có lỗi xảy ra khi xóa cấu hình')
    }
  }

  const openEditModal = (config?: EmailConfig) => {
    setEditingConfig(config || null)
    if (config) {
      form.setFieldsValue(config)
    } else {
      form.resetFields()
    }
    setModalOpen(true)
  }

  const getProviderIcon = (provider: string) => {
    return provider === 'gmail' ?
      <GoogleOutlined className="text-red-500" /> :
      <MailOutlined className="text-blue-500" />
  }

  const getProviderColor = (provider: string) => {
    return provider === 'gmail' ? 'red' : 'blue'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Text strong className="text-lg">Cấu hình Email</Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openEditModal()}
        >
          Thêm Email
        </Button>
      </div>

      <List
        loading={loading}
        dataSource={configs}
        renderItem={(config) => (
          <List.Item
            actions={[
              <Button
                key="edit"
                type="text"
                icon={<EditOutlined />}
                onClick={() => openEditModal(config)}
              />,
              <Popconfirm
                key="delete"
                title="Bạn có chắc muốn xóa cấu hình này?"
                onConfirm={() => handleDeleteConfig(config._id)}
                okText="Xóa"
                cancelText="Hủy"
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            ]}
          >
            <List.Item.Meta
              avatar={getProviderIcon(config.provider)}
              title={
                <Space>
                  {config.displayName}
                  {config.isDefault && (
                    <Tag color="green" icon={<CheckCircleOutlined />}>
                      Mặc định
                    </Tag>
                  )}
                  <Tag color={getProviderColor(config.provider)}>
                    {config.provider.toUpperCase()}
                  </Tag>
                </Space>
              }
              description={
                <div>
                  <Text type="secondary">{config.email}</Text>
                  <br />
                  <Text type="secondary" className="text-xs">
                    Trạng thái: {config.isActive ? 'Hoạt động' : 'Tạm dừng'}
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingConfig ? 'Chỉnh sửa Cấu hình Email' : 'Thêm Cấu hình Email Mới'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setEditingConfig(null)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveConfig}
        >
          <Form.Item
            name="provider"
            label="Nhà cung cấp"
            rules={[{ required: true, message: 'Vui lòng chọn nhà cung cấp!' }]}
          >
            <Select placeholder="Chọn nhà cung cấp email">
              <Select.Option value="gmail">
                <Space>
                  <GoogleOutlined className="text-red-500" />
                  Gmail
                </Space>
              </Select.Option>
              <Select.Option value="outlook" disabled>
                <Space>
                  <MailOutlined className="text-blue-500" />
                  Outlook (Bảo trì)
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="displayName"
            label="Tên hiển thị"
            rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị!' }]}
          >
            <Input placeholder="Tên hiển thị khi gửi email" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Địa chỉ Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không hợp lệ!' }
            ]}
          >
            <Input placeholder="your-email@domain.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu / App Password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
            extra="⚠️ BẮT BUỘC sử dụng App Password cho cả Gmail và Outlook"
          >
            <Input.Password placeholder="App Password (không phải mật khẩu thường)" />
          </Form.Item>

          <Alert
            message="🔐 Hướng dẫn tạo App Password"
            description={
              <div className="space-y-3 text-sm">
                <div>
                  <strong className="text-red-500">⚡ Gmail:</strong>
                  <ol className="ml-4 mt-1 list-decimal space-y-1">
                    <li> <a href="https://myaccount.google.com/u/1/apppasswords?rapt=AEjHL4NcdkY-J3Qb7ijk8v9yhqREoWiXeVGoRVQnN5lZ_r_1efGPTRXFpp4MszM5ak7wVQLasLqDpRmSgMxvWYOWwYRT1xAi8XUETcm-5rRI3yow7t3rMig"
                      target="_blank"
                      rel="noopener noreferrer">
                      Link config app password để gửi mail
                    </a></li>
                    <li>Bật 2-Factor Authentication</li>
                    <li>Vào: <code>Google Account → Security → App passwords</code></li>
                    <li>Tạo App Password cho "Mail"</li>
                    <li>Sử dụng mật khẩu 16 ký tự được tạo</li>
                  </ol>
                </div>
                <div>
                  <strong className="text-blue-500">📧 Outlook/Hotmail:</strong>
                  <ol className="ml-4 mt-1 list-decimal space-y-1">
                    <li>Vào: <code>Microsoft Account → Security → Advanced security options</code></li>
                    <li>Chọn "App passwords"</li>
                    <li>Tạo password mới cho email application</li>
                    <li><span className="text-red-600 font-bold">QUAN TRỌNG:</span> Microsoft đã tắt Basic Auth, bắt buộc dùng App Password</li>
                  </ol>
                </div>

              </div>
            }
            type="warning"
            showIcon
            className="mb-4"
          />

          <Form.Item
            name="isDefault"
            label="Đặt làm mặc định"
            valuePropName="checked"
          >
            <Switch checkedChildren="Mặc định" unCheckedChildren="Không" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingConfig ? 'Cập nhật' : 'Thêm'}
              </Button>
              <Button onClick={() => {
                setModalOpen(false)
                setEditingConfig(null)
                form.resetFields()
              }}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
