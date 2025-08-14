'use client'

import { useEffect, useState } from 'react'
import { 
  Form, 
  Select, 
  Input, 
  Button, 
  message, 
  Alert, 
  Space, 
  Tag, 
  Collapse,
  List,
  Typography,
  Progress,
  Divider
} from 'antd'
import { 
  SendOutlined, 
  GoogleOutlined, 
  MailOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import TemplateSelector from './TemplateSelector'
import dynamic from 'next/dynamic'

const { TextArea } = Input
const { Panel } = Collapse
const { Text } = Typography

// CKEditor - client side only
const CKEditor = dynamic(() => import('@ckeditor/ckeditor5-react').then(m => m.CKEditor), { ssr: false }) as any
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ClassicEditor: any = typeof window !== 'undefined' ? require('@ckeditor/ckeditor5-build-classic') : null
const AnyCKEditor: any = CKEditor

interface DelaySettings {
  enabled: boolean
  delaySeconds: number
  batchSize: number
}

interface EmailSenderProps {
  excelData: any[]
  selectedTemplate?: any
  onTemplateChange?: (template: string, subject: string) => void
  selectedRowKeys?: React.Key[]
  selectedRecipients?: any[]
  onHistoryStart?: (total: number) => string | void
  onHistoryProgress?: (jobId: string | void, batchResults: any[]) => void
  onHistoryFinish?: (jobId: string | void, results: any[], status: 'completed' | 'canceled') => void
  registerStopHandler?: (jobId: string | void, stop: () => void) => void
  onEmailSuccess?: (successfulEmails: string[]) => void
  delaySettings?: DelaySettings
}

export default function EmailSender({ excelData, selectedTemplate, onTemplateChange, selectedRowKeys = [], selectedRecipients = [], onHistoryStart, onHistoryProgress, onHistoryFinish, registerStopHandler, onEmailSuccess, delaySettings }: EmailSenderProps) {
  const [form] = Form.useForm()
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [emailConfigs, setEmailConfigs] = useState<any[]>([])
  const [loadingConfigs, setLoadingConfigs] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<any | null>(null)
  const [currentBatch, setCurrentBatch] = useState(0)
  const [totalBatches, setTotalBatches] = useState(0)
  const [sendingProgress, setSendingProgress] = useState('')
	const [templateHtml, setTemplateHtml] = useState<string>('')


  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const handleSendEmails = async (values: any) => {
    // Chỉ gửi cho những người được chọn
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn người nhận trong bảng trước khi gửi')
      return
    }

    // Ưu tiên danh sách đã chọn truyền từ bảng; fallback filter theo index (trường hợp dữ liệu từ uploader)
    const dataToSend = (selectedRecipients && selectedRecipients.length > 0)
      ? selectedRecipients
      : excelData.filter((_, index) => selectedRowKeys.includes(index))

    if (dataToSend.length === 0) {
      message.warning('Vui lòng chọn ít nhất một người để gửi email')
      return
    }

    setIsLoading(true)
    setResults([])
    setCurrentBatch(0)
    setSendingProgress('')

    try {
      const token = localStorage.getItem('token')
      let allResults: any[] = []
      const jobId = onHistoryStart?.(dataToSend.length)
      let canceled = false
      const stop = () => { canceled = true }
      registerStopHandler?.(jobId, stop)
      
      // helper: cập nhật quota UI sau mỗi request
      const applyQuotaUpdate = (quota: any, configId: string) => {
        if (!quota) return
        setSelectedConfig(prev => (prev && (prev._id === configId)) ? { ...prev, dailyLimit: quota.limit, dailySent: quota.used } : prev)
        setEmailConfigs(prev => prev.map(cfg => cfg._id === configId ? { ...cfg, dailyLimit: quota.limit, dailySent: quota.used } : cfg))
      }

      // Kiểm tra delay settings
      if (delaySettings?.enabled) {
        // Gửi theo batch với delay
        const batchSize = delaySettings.batchSize
        const batches = []
        
        // Chia data thành các batch
        for (let i = 0; i < dataToSend.length; i += batchSize) {
          batches.push(dataToSend.slice(i, i + batchSize))
        }
        
        setTotalBatches(batches.length)
        
        for (let i = 0; i < batches.length; i++) {
          setCurrentBatch(i + 1)
          setSendingProgress(`Đang gửi batch ${i + 1}/${batches.length} (${batches[i].length} email)...`)
          
          if (canceled) break
          const response = await fetch('/api/email/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              emailConfigId: values.emailConfigId,
              recipients: batches[i],
              subject: values.subject,
              template: values.template,
            }),
          })

          const data = await response.json()
          
          if (response.ok) {
            allResults = [...allResults, ...data.results]
            setResults(allResults)
            onHistoryProgress?.(jobId, data.results)
            applyQuotaUpdate(data.quota, values.emailConfigId)
            if (data.trimmed) {
              message.info('Một phần danh sách đã bị giới hạn bởi quota trong ngày')
            }
          } else {
            message.error(`Lỗi ở batch ${i + 1}: ${data.message}`)
          }
          
          // Delay giữa các batch (trừ batch cuối)
          if (i < batches.length - 1) {
            setSendingProgress(`Chờ ${delaySettings.delaySeconds}s trước batch tiếp theo...`)
            await delay(delaySettings.delaySeconds * 1000)
          }
        }
      } else {
        // Gửi tất cả cùng lúc (không delay)
        setSendingProgress('Đang gửi tất cả email...')
        
        const response = await fetch('/api/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            emailConfigId: values.emailConfigId,
            recipients: dataToSend,
            subject: values.subject,
            template: values.template,
          }),
        })

        const data = await response.json()
        
        if (response.ok) {
          allResults = data.results
          setResults(allResults)
          onHistoryProgress?.(jobId, data.results)
          applyQuotaUpdate(data.quota, values.emailConfigId)
          if (data.trimmed) {
            message.info('Một phần danh sách đã bị giới hạn bởi quota trong ngày')
          }
        } else {
          message.error(data.message || 'Có lỗi xảy ra khi gửi email')
        }
      }

      // Xử lý kết quả cuối cùng
      const successCount = allResults.filter((r: any) => r.status === 'success').length
      const successfulEmails = allResults
        .filter((r: any) => r.status === 'success')
        .map((r: any) => r.email)
      
      message.success(`Đã gửi email hoàn tất! Thành công: ${successCount}/${allResults.length}`)
      
      // Cập nhật lịch sử
      onHistoryFinish?.(jobId, allResults, canceled ? 'canceled' : 'completed')
      
      // Xóa những người gửi thành công khỏi bảng
      if (successfulEmails.length > 0) {
        onEmailSuccess?.(successfulEmails)
      }
      
    } catch (error) {
      console.error('Error sending emails:', error)
      message.error('Có lỗi xảy ra khi gửi email')
    } finally {
      setIsLoading(false)
      setCurrentBatch(0)
      setTotalBatches(0)
      setSendingProgress('')
    }
  }

	const loadDefaultTemplate = () => {
    const template = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Xin chào {yyy}!</h2>
    <p>Chúng tôi gửi email này đến: <strong>{mail}</strong></p>
    <p>Chức vụ của bạn: <strong>{ttt}</strong></p>
    
    <p style="margin-top: 30px;">
      Trân trọng,<br/>
      <strong style="color: #2563eb;">Email Sender Team</strong>
    </p>
  </div>
</body>
</html>
    `.trim()
		form.setFieldsValue({ template })
		setTemplateHtml(template)
  }

  // Fetch email configs
  useEffect(() => {
    fetchEmailConfigs()
  }, [])

	// Auto-fill khi có selectedTemplate
  useEffect(() => {
		if (selectedTemplate) {
			form.setFieldsValue({
				subject: selectedTemplate.subject,
				template: selectedTemplate.content
			})
			setTemplateHtml(selectedTemplate.content)
			// Notify parent component about template change
			onTemplateChange?.(selectedTemplate.content, selectedTemplate.subject)
		}
  }, [selectedTemplate, form, onTemplateChange])

  // Watch form changes to update parent
  const handleFormChange = () => {
    const values = form.getFieldsValue()
    if (values.template && values.subject) {
      onTemplateChange?.(values.template, values.subject)
    }
  }

  const fetchEmailConfigs = async () => {
    setLoadingConfigs(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/email-config', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setEmailConfigs(data.configs)
        
        // Set default config if available
        const defaultConfig = data.configs.find((config: any) => config.isDefault)
        if (defaultConfig) {
          form.setFieldsValue({ emailConfigId: defaultConfig._id })
          setSelectedConfig(defaultConfig)
        }
      }
    } catch (error) {
      message.error('Không thể tải cấu hình email')
    } finally {
      setLoadingConfigs(false)
    }
  }

  // Refetch configs and templates after modals close via a simple visibility listener from parent Tab
  useEffect(() => {
    const handler = () => {
      // nhẹ nhàng reload configs/template list khi user quay lại tab
      fetchEmailConfigs()
    }
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [])

  const getProviderIcon = (provider: string) => {
    return provider === 'gmail' ? <GoogleOutlined /> : <MailOutlined />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSendEmails}
        onValuesChange={handleFormChange}
        size="small"
        className="mobile-form"
        initialValues={{
          emailConfigId: '',
          subject: 'Thông báo từ {xxx}',
          template: ''
        }}
      >
        {/* Email Config Selection */}
        <Form.Item
          name="emailConfigId"
          label="Cấu hình Email"
          rules={[{ required: true, message: 'Vui lòng chọn cấu hình email!' }]}
        >
          <Select 
            size="middle" 
            placeholder="Chọn cấu hình email"
            loading={loadingConfigs}
            className="w-full"
            onChange={(val) => {
              const cfg = emailConfigs.find(cfg => cfg._id === val)
              setSelectedConfig(cfg || null)
            }}
            notFoundContent={emailConfigs.length === 0 ? "Chưa có cấu hình email. Vui lòng thêm trong tab Cấu hình." : "Không tìm thấy"}
          >
            {emailConfigs.map((config: any) => (
              <Select.Option key={config._id} value={config._id}>
                <Space size="small" wrap>
                  {getProviderIcon(config.provider)}
                  <span className="text-sm">{config.displayName}</span>
                  <Text type="secondary" className="text-xs hidden sm:inline">({config.email})</Text>
                  {config.isDefault && <Tag color="blue">Mặc định</Tag>}
                  <Tag color={(config.dailySent ?? 0) < (config.dailyLimit ?? 500) ? 'green' : 'red'}>
                    Đã gửi {(config.dailySent ?? 0)}/{config.dailyLimit ?? 500}
                  </Tag>
                </Space>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Template Selection */}
        <Form.Item
          label="Chọn Template"
        >
	          <TemplateSelector 
	            onSelectTemplate={(template) => {
	              if (template) {
	                form.setFieldsValue({
	                  subject: template.subject,
	                  template: template.content
	                })
	                setTemplateHtml(template.content)
                // Cập nhật ngay cho parent để nút preview dùng được luôn
                onTemplateChange?.(template.content, template.subject)
	                message.success(`Đã áp dụng template: ${template.name}`)
	              }
	            }}
	          />
        </Form.Item>

        {/* Subject */}
        <Form.Item
          name="subject"
          label="Tiêu đề email"
          rules={[{ required: true, message: 'Vui lòng nhập tiêu đề email!' }]}
        >
          <Input 
            size="middle"
            placeholder="Nhập tiêu đề email"
            prefix={<FileTextOutlined className="text-gray-400" />}
            className="w-full"
          />
        </Form.Item>

        {/* Template */}
        <Form.Item
          name="template"
          label={
            <div className="flex justify-between items-center w-full">
              <span>Nội dung</span>
            </div>
          }
          rules={[{ required: true, message: 'Vui lòng nhập template email!' }]}
        >
	          <div className="bg-white rounded border">
	            <AnyCKEditor
	              key={templateHtml ? `tpl-${templateHtml.length}` : 'tpl-0'}
	              editor={ClassicEditor}
	              data={templateHtml || form.getFieldValue('template') || ''}
	              disableWatchdog={true}
	              config={{
	                toolbar: {
	                  items: ['heading','|','bold','italic','underline','link','|','bulletedList','numberedList','|','undo','redo','|','blockQuote','insertTable']
	                },
	                placeholder: 'Nhập template email HTML...'
	              }}
	              onChange={(event: any, editor: any) => {
	                const data = editor.getData()
	                setTemplateHtml(data)
	                form.setFieldsValue({ template: data })
	                handleFormChange()
	              }}
	            />
	          </div>
        </Form.Item>

        {/* Variables Info */}
        {/* <Alert
          message="Biến có thể sử dụng trong template"
          description={
            <div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div><Tag color="blue">{'{xxx}'}</Tag> ID (Cột 1)</div>
                <div><Tag color="green">{'{yyy}'}</Tag> Họ tên (Cột 2)</div>
                <div><Tag color="red">{'{mail}'}</Tag> Email (Cột 3)</div>
                <div><Tag color="orange">{'{ttt}'}</Tag> Chức vụ (Cột 4)</div>
                <div><Tag color="purple">{'{zzz}'}</Tag> Mã (Cột 5)</div>
                <div><Tag color="cyan">{'{www}'}</Tag> Địa chỉ (Cột 6)</div>
                <div><Tag color="pink">{'{uuu}'}</Tag> SĐT (Cột 7)</div>
                <div><Tag color="lime">{'{vvv}'}</Tag> Công ty (Cột 8)</div>
                <div><Tag color="gold">{'{rrr}'}</Tag> Ghi chú (Cột 9)</div>
              </div>
              <div className="mt-3 text-xs text-gray-600">
                <strong>Hỗ trợ các format:</strong> {'{xxx}'}, {'{XXX}'}, {'[xxx]'}, {'[XXX]'}, {'(xxx)'}, {'(XXX)'}, hoặc xxx, XXX
              </div>
            </div>
          }
          type="info"
          showIcon
          className="mb-4"
        /> */}

        {/* Send Button */}
        {/* Progress Bar */}
        {isLoading && totalBatches > 1 && (
          <Form.Item>
            <div className="space-y-2">
              <Progress 
                percent={Math.round((currentBatch / totalBatches) * 100)}
                format={() => `${currentBatch}/${totalBatches} batch`}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <Alert
                message={sendingProgress}
                type="info"
                showIcon
                className="text-sm"
              />
            </div>
          </Form.Item>
        )}

        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            disabled={selectedRowKeys.length === 0}
            size="middle"
            icon={<SendOutlined />}
            className="w-full h-10 sm:h-12 text-sm sm:text-base font-medium"
            block
          >
            {isLoading 
              ? 'Đang gửi...'
              : `Gửi (${selectedRowKeys.length})`
            }
          </Button>
        </Form.Item>
      </Form>

      {/* Results */}
      {results.length > 0 && (
        <>
          <Divider>Kết quả gửi email</Divider>
          <Collapse>
            <Panel 
              header={
                <Space>
                  <Text strong>Kết quả gửi email</Text>
                  <Tag color="green">
                    Thành công: {results.filter(r => r.status === 'success').length}
                  </Tag>
                  <Tag color="red">
                    Thất bại: {results.filter(r => r.status === 'error').length}
                  </Tag>
                </Space>
              } 
              key="1"
            >
              <List
                size="small"
                dataSource={results}
                renderItem={(result: any) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        result.status === 'success' 
                          ? <CheckCircleOutlined className="text-green-500" />
                          : <CloseCircleOutlined className="text-red-500" />
                      }
                      title={result.email}
                      description={
                        result.status === 'success' 
                          ? `Gửi thành công - ID: ${result.messageId?.split('@')[0] || 'N/A'}` 
                          : `Lỗi: ${result.error}`
                      }
                    />
                    <Tag color={result.status === 'success' ? 'green' : 'red'}>
                      {result.status === 'success' ? 'Thành công' : 'Thất bại'}
                    </Tag>
                  </List.Item>
                )}
              />
            </Panel>
          </Collapse>
        </>
      )}
    </div>
  )
}
