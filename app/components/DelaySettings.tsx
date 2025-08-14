'use client'

import { useState, useEffect } from 'react'
import { 
  Card, 
  Form, 
  InputNumber, 
  Button, 
  Switch,
  Space,
  Typography,
  Divider,
  message,
  Alert
} from 'antd'
import { 
  ClockCircleOutlined,
  SaveOutlined,
  SettingOutlined
} from '@ant-design/icons'

const { Text, Title } = Typography

interface DelaySettingsProps {
  onSettingsChange?: (settings: DelaySettings) => void
}

export interface DelaySettings {
  enabled: boolean
  delaySeconds: number
  batchSize: number
}

export default function DelaySettings({ onSettingsChange }: DelaySettingsProps) {
  const [form] = Form.useForm()
  const [settings, setSettings] = useState<DelaySettings>({
    enabled: false,
    delaySeconds: 30,
    batchSize: 50
  })

  useEffect(() => {
    // Load settings từ localStorage
    const savedSettings = localStorage.getItem('emailDelaySettings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      setSettings(parsed)
      form.setFieldsValue(parsed)
    }
  }, [form])

  const handleSaveSettings = (values: DelaySettings) => {
    setSettings(values)
    localStorage.setItem('emailDelaySettings', JSON.stringify(values))
    onSettingsChange?.(values)
    message.success('Đã lưu cài đặt delay!')
  }

  const calculateTotalTime = () => {
    if (!settings.enabled) return 0
    const batches = Math.ceil(100 / settings.batchSize) // Giả sử 100 người
    const totalSeconds = (batches - 1) * settings.delaySeconds
    return totalSeconds
  }

  return (
    <Card 
      title={
        <Space>
          <ClockCircleOutlined className="text-blue-600" />
          <span>Cài đặt Delay gửi email</span>
        </Space>
      }
      className="shadow-lg"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSaveSettings}
        initialValues={settings}
      >
        <Form.Item
          name="enabled"
          label="Bật delay gửi email"
          valuePropName="checked"
        >
          <Switch 
            checkedChildren="Bật" 
            unCheckedChildren="Tắt"
            onChange={(checked) => {
              const newSettings = { ...settings, enabled: checked }
              setSettings(newSettings)
              form.setFieldsValue(newSettings)
            }}
          />
        </Form.Item>

        <Form.Item
          name="batchSize"
          label="Số người trong 1 batch"
          rules={[
            { required: true, message: 'Vui lòng nhập số người trong batch!' },
            { type: 'number', min: 1, max: 1000, message: 'Từ 1 đến 1000 người!' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="Ví dụ: 50"
            min={1}
            max={1000}
            addonAfter="người"
            onChange={(value) => {
              if (value) {
                const newSettings = { ...settings, batchSize: value }
                setSettings(newSettings)
              }
            }}
          />
        </Form.Item>

        <Form.Item
          name="delaySeconds"
          label="Delay giữa các batch"
          rules={[
            { required: true, message: 'Vui lòng nhập thời gian delay!' },
            { type: 'number', min: 1, max: 3600, message: 'Từ 1 đến 3600 giây!' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="Ví dụ: 30"
            min={1}
            max={3600}
            addonAfter="giây"
            onChange={(value) => {
              if (value) {
                const newSettings = { ...settings, delaySeconds: value }
                setSettings(newSettings)
              }
            }}
          />
        </Form.Item>

        <Alert
          message="Thông tin delay"
          description={
            settings.enabled ? (
              <div>
                <p>
                  • Gửi <strong>{settings.batchSize}</strong> email, delay <strong>{settings.delaySeconds}</strong> giây
                </p>
                <p>
                  • Với 100 người sẽ mất khoảng <strong>{Math.ceil(calculateTotalTime() / 60)}</strong> phút
                </p>
              </div>
            ) : (
              <p>Delay đã tắt - tất cả email sẽ được gửi ngay lập tức</p>
            )
          }
          type={settings.enabled ? "info" : "warning"}
          showIcon
        />

        <Divider />

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            icon={<SaveOutlined />}
            size="large"
            className="w-full"
          >
            Lưu cài đặt
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
