'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Table, 
  Space,
  Avatar,
  Dropdown,
  Spin,
  Badge,
  Modal,
  Tabs,
  Popconfirm,
  message,
  Tag,
  Alert,
  Input,
  Pagination
} from 'antd'
import { 
  MailOutlined, 
  LogoutOutlined, 
  UserOutlined,
  FileExcelOutlined,
  SendOutlined,
  FileTextOutlined,
  SettingOutlined,
  DeleteOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined
} from '@ant-design/icons'
import EmailSender from '../components/EmailSender'
import ExcelUploader from '../components/ExcelUploader'
import TemplateManager from '../components/TemplateManager'
import EmailConfigManager from '../components/EmailConfigManager'
import DelaySettings, { DelaySettings as DelaySettingsType } from '../components/DelaySettings'

const { Header, Content } = Layout
const { Title, Text } = Typography

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<null | {
    userId?: string
    username: string
    email: string
    fullName?: string
    role: string
  }>(null)
  const [excelData, setExcelData] = useState<any[]>([])
  const [serverData, setServerData] = useState<any[]>([])
  const [totalServer, setTotalServer] = useState(0)
  const [serverPage, setServerPage] = useState(1)
  const [serverPageSize, setServerPageSize] = useState(10)
  const [searchQ, setSearchQ] = useState('')
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [previewContent, setPreviewContent] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [currentTemplate, setCurrentTemplate] = useState('')
  const [currentSubject, setCurrentSubject] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [emailHistory, setEmailHistory] = useState<any[]>([])
  const [stopHandlers, setStopHandlers] = useState<Record<string, () => void>>({})
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [delaySettings, setDelaySettings] = useState<DelaySettingsType>({
    enabled: false,
    delaySeconds: 30,
    batchSize: 50
  })
  const [emailStatuses, setEmailStatuses] = useState<Record<string, 'success' | 'error'>>({})
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }

      setIsAuthenticated(true)

    try {
      const payloadSegment = token.split('.')[1]
      const decoded = JSON.parse(atob(payloadSegment))
      setUser({
        userId: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        fullName: decoded.fullName,
        role: decoded.role || 'user',
      })
      // fetch recipients initial
      fetch(`/api/recipients?page=1&pageSize=${serverPageSize}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => { setServerData(data.items); setTotalServer(data.total) })
        .catch(() => {})
    } catch (err) {
      console.warn('Cannot decode JWT token payload')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/')
  }

  const handleExcelData = async (data: any[]) => {
    setExcelData(data)
    setEmailStatuses({})

    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch('/api/recipients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ rows: data }),
      })
      if (res.ok) {
        // Reload recipients from server immediately so table updates without F5
        const params = new URLSearchParams({ page: '1', pageSize: String(serverPageSize) })
        if (searchQ) params.set('q', searchQ)
        const list = await fetch(`/api/recipients?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (list.ok) {
          const payload = await list.json()
          setServerData(payload.items || [])
          setTotalServer(payload.total || 0)
          setServerPage(1)
        }
      }
    } catch (e) {
      console.warn('Persist recipients failed:', e)
    }
  }

  const replaceVariables = (template: string, variables: any) => {
    let result = template || ''
    const safeVars = variables && typeof variables === 'object' ? variables : {}

    const getter = (key: string) => {
      const v = safeVars[key]
      return v == null ? '' : String(v)
    }

    const patterns = [
      { pattern: /\{(xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\}/g, getValue: (k: string) => getter(k) },
      { pattern: /\{(XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\}/g, getValue: (k: string) => getter(k.toLowerCase()) },
      { pattern: /\[(xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\]/g, getValue: (k: string) => getter(k) },
      { pattern: /\[(XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\]/g, getValue: (k: string) => getter(k.toLowerCase()) },
      { pattern: /\((xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\)/g, getValue: (k: string) => getter(k) },
      { pattern: /\((XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\)/g, getValue: (k: string) => getter(k.toLowerCase()) },
      { pattern: /\b(xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\b/g, getValue: (k: string) => getter(k) },
      { pattern: /\b(XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\b/g, getValue: (k: string) => getter(k.toLowerCase()) },
    ]

    patterns.forEach(({ pattern, getValue }) => {
      result = result.replace(pattern, (_m, captured) => getValue(captured))
    })

    return result
  }

  const handlePreviewEmail = (record: any) => {
    setSelectedRecord(record)
    
    // Lấy template từ người dùng đang chọn/nhập
    let templateToUse = currentTemplate
    
    if (!templateToUse && selectedTemplate) {
      // Nếu chưa có currentTemplate, dùng template đã chọn
      templateToUse = selectedTemplate.content
    }
    
    if (!templateToUse) {
      message.warning('Vui lòng chọn template trước khi preview')
      return
    }
    
    console.log('Preview - Using template:', templateToUse)
    console.log('Preview - Record data:', record)
    
    const processedContent = replaceVariables(templateToUse, record)
    setPreviewContent(processedContent)
    setPreviewModalOpen(true)
  }

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template)
  }

  const handleDeleteRecord = (index: number) => {
    const newData = excelData.filter((_, i) => i !== index)
    setExcelData(newData)
    // Remove from selected if was selected
    setSelectedRowKeys(prev => prev.filter(key => key !== index))
    message.success('Đã xóa dòng dữ liệu')
  }

  const handleSelectionChange = (selectedKeys: React.Key[]) => {
    setSelectedRowKeys(selectedKeys)
  }

  const getSelectedData = () => {
    return excelData.filter((_, index) => selectedRowKeys.includes(index))
  }

  const startHistoryJob = (total: number) => {
    const id = Date.now().toString()
    const entry = { id, timestamp: new Date().toISOString(), results: [], total, success: 0, failed: 0, status: 'inProgress' as const }
    setEmailHistory(prev => [entry, ...prev])
    return id
    
  }

  const updateHistoryProgress = (jobId: string, batchResults: any[]) => {
    setEmailHistory(prev => prev.map(e => e.id === jobId ? {
      ...e,
      results: [...e.results, ...batchResults],
      success: e.success + batchResults.filter((r: any) => r.status === 'success').length,
      failed: e.failed + batchResults.filter((r: any) => r.status === 'error').length,
    } : e))

    const newStatuses: Record<string, 'success' | 'error'> = {}
    batchResults.forEach((result: any) => { newStatuses[result.email] = result.status })
    setEmailStatuses(prev => ({ ...prev, ...newStatuses }))
  }

  const finishHistoryJob = (jobId: string, allResults: any[], status: 'completed' | 'canceled') => {
    setEmailHistory(prev => prev.map(e => e.id === jobId ? {
      ...e,
      results: allResults,
      total: allResults.length,
      success: allResults.filter(r => r.status === 'success').length,
      failed: allResults.filter(r => r.status === 'error').length,
      status,
    } : e))
    setStopHandlers(prev => { const { [jobId]: _, ...rest } = prev; return rest })
  }

  const [historyFilterDate, setHistoryFilterDate] = useState<string | null>(null)
  const [historyItems, setHistoryItems] = useState<any[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState(10)
  const getLocalDateString = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  }

  const fetchHistory = (dateParam?: string | null, page = historyPage, pageSize = historyPageSize) => {
    const token = localStorage.getItem('token')
    const date = (dateParam ?? historyFilterDate) || getLocalDateString()
    const tzOffset = new Date().getTimezoneOffset() // minutes offset: UTC - local (VN ~ -420)
    return fetch(`/api/email/history?date=${date}&tz=${tzOffset}&page=${page}&pageSize=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { setHistoryItems(data.items || []); setHistoryTotal(data.total || 0); setHistoryPage(data.page || 1); setHistoryPageSize(data.pageSize || pageSize) })
      .catch(() => setHistoryItems([]))
  }

  // Fetch when date changes
  useEffect(() => {
    if (historyModalOpen) {
      setHistoryPage(1)
      fetchHistory(historyFilterDate, 1, historyPageSize)
    }
  }, [historyFilterDate])

  // Fetch when opening modal
  useEffect(() => {
    if (historyModalOpen) fetchHistory()
  }, [historyModalOpen])

  // Fetch lịch sử ngay khi load trang để nút Lịch sử có số lượng đúng sau F5
  useEffect(() => {
    fetchHistory(getLocalDateString(), 1, historyPageSize)
  }, [])

  // Khi load trang (hoặc F5), khôi phục job gần nhất để UI nắm trạng thái
  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('/api/email/jobs', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.jobs)) {
          // map các job đã hoàn thành vào emailHistory để UI xem nhanh
          const mapped = data.jobs.map((j: any) => ({
            id: j._id,
            timestamp: j.createdAt,
            results: j.results,
            total: j.total,
            success: j.success,
            failed: j.failed,
            status: j.status
          }))
          setEmailHistory(mapped)
        }
      })
      .catch(() => {})
  }, [])

  const handleEmailSuccess = async (successfulEmails: string[]) => {
    // Nếu đang dùng dữ liệu từ DB (serverData), xóa trong DB rồi reload bảng
    if (serverData.length > 0) {
      const idsToDelete = serverData
        .filter(item => successfulEmails.includes(item.mail || item.yyy))
        .map(item => item._id)
        .filter(Boolean)

      if (idsToDelete.length > 0) {
        const token = localStorage.getItem('token')
        await fetch('/api/recipients/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ids: idsToDelete })
        })
        // Reload current page
        await fetch(`/api/recipients?page=${serverPage}&pageSize=${serverPageSize}${searchQ ? `&q=${encodeURIComponent(searchQ)}` : ''}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json()).then(data => { setServerData(data.items); setTotalServer(data.total) })
      }

      setSelectedRowKeys([])
      message.success(`Đã xóa ${idsToDelete.length} người đã gửi thành công khỏi danh sách`)
      return
    }

    // Trường hợp đang dùng dữ liệu tạm từ Excel (chưa lưu DB)
    const remainingData = excelData.filter(item => {
      const email = item.mail || item.yyy
      return !successfulEmails.includes(email)
    })
    setExcelData(remainingData)
    setSelectedRowKeys([])
    
    const newEmailStatuses = { ...emailStatuses }
    successfulEmails.forEach(email => { delete newEmailStatuses[email] })
    setEmailStatuses(newEmailStatuses)
    message.success(`Đã xóa ${successfulEmails.length} người đã gửi thành công khỏi danh sách`)
  }

  const handleDelaySettingsChange = (settings: DelaySettingsType) => {
    setDelaySettings(settings)
  }

  // Fetch recipients when search query changes (debounce light)
  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/recipients?page=1&pageSize=${serverPageSize}${searchQ ? `&q=${encodeURIComponent(searchQ)}` : ''}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
        .then(res => res.json())
        .then(data => { setServerData(data.items); setTotalServer(data.total); setServerPage(1) })
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ, serverPageSize])

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Thông tin tài khoản',
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout,
    },
  ]

  const getDisplayName = () => {
    if (!user) return 'User'
    return user.fullName && user.fullName.trim().length > 0 ? user.fullName : user.username
  }

  const getRoleLabel = () => {
    if (!user) return ''
    return user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'
  }

  const getInitials = () => {
    if (!user) return 'U'
    const base = getDisplayName()
    const words = base.trim().split(/\s+/)
    if (words.length === 1) return words[0].charAt(0).toUpperCase()
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
  }

  const columns = [
    {
      title: 'xxx (Cột 1)',
      dataIndex: 'xxx',
      key: 'xxx',
      width: 100,
    },
    {
      title: 'yyy (Cột 2)',
      dataIndex: 'yyy',
      key: 'yyy',
      width: 150,
      render: (name: string, record: any) => (
        <Button 
          type="link" 
          onClick={() => handlePreviewEmail(record)}
          className="p-0 h-auto font-medium"
        >
          {name}
        </Button>
      ),
    },
    {
      title: 'mail (Cột 3)',
      dataIndex: 'mail',
      key: 'mail',
      width: 200,
      render: (email: string, record: any) => {
        const emailToCheck = email || record.yyy
        const status = emailStatuses[emailToCheck]
        
        return (
          <Space>
            <Text copyable className="text-blue-600">
              {email}
            </Text>
            {status === 'error' && (
              <CloseOutlined 
                className="text-red-500 text-lg" 
                title={`Gửi email thất bại: ${emailToCheck}`}
              />
            )}
          </Space>
        )
      },
    },
    {
      title: 'ttt (Cột 4)',
      dataIndex: 'ttt',
      key: 'ttt',
      width: 120,
    },
    {
      title: 'zzz (Cột 5)',
      dataIndex: 'zzz',
      key: 'zzz',
      width: 100,
    },
    {
      title: 'www (Cột 6)',
      dataIndex: 'www',
      key: 'www',
      width: 150,
    },
    {
      title: 'uuu (Cột 7)',
      dataIndex: 'uuu',
      key: 'uuu',
      width: 120,
    },
    {
      title: 'vvv (Cột 8)',
      dataIndex: 'vvv',
      key: 'vvv',
      width: 150,
    },
    {
      title: 'rrr (Cột 9)',
      dataIndex: 'rrr',
      key: 'rrr',
      width: 150,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any, index: number) => (
        <Popconfirm
          title="Xóa người này?"
          description="Bạn có chắc muốn xóa người này khỏi danh sách?"
          onConfirm={async () => {
            // Nếu có id (serverData), gọi API; nếu không, xóa khỏi excelData state
            if (record._id) {
              const token = localStorage.getItem('token')
              await fetch(`/api/recipients/${record._id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              })
              // refresh server list
              fetch(`/api/recipients?page=${serverPage}&pageSize=${serverPageSize}${searchQ ? `&q=${encodeURIComponent(searchQ)}` : ''}`, {
                headers: { Authorization: `Bearer ${token}` }
              })
                .then(res => res.json())
                .then(data => { setServerData(data.items); setTotalServer(data.total) })
            } else {
              handleDeleteRecord(index)
            }
            message.success('Đã xóa')
          }}
          okText="Xóa"
          cancelText="Hủy"
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ]

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Layout className="min-h-screen">
      <Header className="shadow-lg" style={{ background: 'linear-gradient(to right, #f97316, #c2410c)' }}>
        <div className="flex justify-between items-center h-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="bg-white p-2 sm:p-3 rounded-lg shadow">
              <MailOutlined className="text-orange-600 text-lg sm:text-2xl" />
            </div>
            <div className="leading-tight">
              <div className="text-white font-semibold text-base sm:text-lg">Email Sender</div>
              <div className="text-blue-100 text-xs sm:text-sm">Dashboard</div>
            </div>
          </div>
          
            <Dropdown 
              menu={{ items: userMenuItems }} 
              placement="bottomRight"
              trigger={['click']}
            >
            <button className="group flex items-center gap-3 rounded-full px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-white/10 transition-colors">
              <Avatar 
                className="bg-blue-500 select-none"
                size="large"
              >
                {getInitials()}
              </Avatar>
              <div className="hidden sm:block text-left">
                <div className="text-white font-medium leading-none">{getDisplayName()}</div>
                <div className="text-blue-100 text-xs leading-none">{getRoleLabel()}</div>
                </div>
            </button>
            </Dropdown>
        </div>
      </Header>

      <Content className="bg-gray-50 p-2 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <Tabs 
            defaultActiveKey="email"
            size="large"
            tabPosition="top"
            className="mobile-tabs"
            items={[
              {
                key: 'email',
                label: (
                  <span className="inline-flex items-center gap-2">
                    <SendOutlined />
                    <span>Gửi Email</span>
                  </span>
                ),
                children: (
                  <div>
                    <Row gutter={[16, 16]} className="sm:gutter-24">
                      {/* Upload Excel Card */}
                      <Col xs={24} lg={12}>
                        <Card
                          title={
                            <Space>
                              <FileExcelOutlined className="text-green-600" />
                              <span>Upload File Excel</span>
                            </Space>
                          }
                          className="h-full shadow-lg"
                          styles={{ body: { padding: '12px' } }}
                        >
                          <ExcelUploader onDataLoaded={handleExcelData} />
                        </Card>
                      </Col>

                      {/* Email Sender Card */}
                      <Col xs={24} lg={12}>
                        <Card
                          title={
                            <Space>
                              <SendOutlined className="text-blue-600" />
                              <span>Gửi Email</span>
                              {excelData.length > 0 && (
                                <Badge count={excelData.length} showZero color="blue" />
                              )}
                            </Space>
                          }
                          className="h-full shadow-lg"
                          styles={{ body: { padding: '12px' } }}
                        >
                          <EmailSender 
                            excelData={(serverData.length > 0 ? serverData : excelData)} 
                            selectedTemplate={selectedTemplate}
                            selectedRowKeys={selectedRowKeys}
                            selectedRecipients={(serverData.length > 0 ? serverData : excelData).filter((_, idx) => selectedRowKeys.includes(((serverData.length > 0 ? serverData : excelData)[idx]._id) || idx))}
                            onTemplateChange={(template, subject) => {
                              setCurrentTemplate(template)
                              setCurrentSubject(subject)
                            }}
                            onHistoryStart={(total) => startHistoryJob(total)}
                            onHistoryProgress={(jobId, batchResults) => updateHistoryProgress(jobId as string, batchResults)}
                            onHistoryFinish={(jobId, results, status) => finishHistoryJob(jobId as string, results, status)}
                            registerStopHandler={(jobId, stop) => setStopHandlers(prev => ({ ...prev, [jobId as string]: stop }))}
                            onEmailSuccess={handleEmailSuccess}
                            delaySettings={delaySettings}
                          />
                        </Card>
                      </Col>
                    </Row>

                                {/* Data Table */}
            {(serverData.length > 0 || excelData.length > 0) && (
              <Card
                title={
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Space>
                      <FileExcelOutlined className="text-green-600" />
                      <span className="font-medium">Dữ liệu từ Excel</span>
                      <Badge count={excelData.length} showZero color="green" />
                    </Space>
                    <div className="w-full sm:w-auto flex flex-col gap-2">
                      <Input
                        placeholder="Tìm (xxx hoặc mail)"
                        size="middle"
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        className="w-full sm:w-72"
                      />
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                      <Button
                        icon={<HistoryOutlined />}
                          className="w-full sm:w-auto"
                        onClick={() => setHistoryModalOpen(true)}
                      >
                          Lịch sử ({historyItems.length})
                        </Button>
                        <Tag color={selectedRowKeys.length ? 'blue' : 'default'} className="px-3 py-1 text-center">
                          Đã chọn {selectedRowKeys.length}
                        </Tag>
                        <Popconfirm
                          title="Xóa các mục đã chọn?"
                          description="Bạn có chắc muốn xóa tất cả các mục đã chọn?"
                          onConfirm={async () => {
                            const token = localStorage.getItem('token')
                            const ids = selectedRowKeys.filter(k => typeof k === 'string') as string[]
                            if (ids.length === 0) return
                            await fetch('/api/recipients/bulk-delete', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ ids })
                            })
                            fetch(`/api/recipients?page=${serverPage}&pageSize=${serverPageSize}${searchQ ? `&q=${encodeURIComponent(searchQ)}` : ''}`, {
                              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                            }).then(res => res.json()).then(data => { setServerData(data.items); setTotalServer(data.total); setSelectedRowKeys([]) })
                            message.success('Đã xóa các mục đã chọn')
                          }}
                          okText="Xóa"
                          cancelText="Hủy"
                        >
                          <Button
                          danger
                          className="w-full sm:w-auto"
                          disabled={selectedRowKeys.length === 0}
                        >
                          Xóa đã chọn
                      </Button>
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                }
                className="mt-8 shadow-lg"
                style={{ marginTop: 24 }}
                styles={{ body: { padding: '24px' } }}
              >
                <Table
                  columns={columns}
                  dataSource={(serverData.length > 0 ? serverData : excelData).map((item, index) => ({ ...item, key: item._id || index }))}
                  rowSelection={{
                    selectedRowKeys,
                    onChange: handleSelectionChange,
                    getCheckboxProps: (record) => ({
                      name: record.yyy,
                    }),
                  }}
                  scroll={{ x: 800, y: 400 }}
                  pagination={{
                    current: serverPage,
                    pageSize: serverPageSize,
                    total: serverData.length > 0 ? totalServer : excelData.length,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 20, 50, 100],
                    showQuickJumper: false,
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} / ${total}`,
                    size: 'small',
                    responsive: true,
                    onChange: (page, pageSize) => {
                      setServerPage(page)
                      setServerPageSize(pageSize)
                      fetch(`/api/recipients?page=${page}&pageSize=${pageSize}${searchQ ? `&q=${encodeURIComponent(searchQ)}` : ''}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                      })
                        .then(res => res.json())
                        .then(data => { setServerData(data.items); setTotalServer(data.total) })
                        .catch(() => {})
                    }
                  }}
                  size="middle"
                  bordered={false}
                  className="mobile-table spaced-table"
                />
              </Card>
            )}
                  </div>
                ),
              },
              {
                key: 'templates',
                label: (
                  <span className="inline-flex items-center gap-2">
                    <FileTextOutlined />
                    <span>Templates</span>
                  </span>
                ),
                children: (
                  <Card className="shadow-lg" styles={{ body: { padding: '24px' } }}>
                    {/* {excelData.length === 0 && (
                      <Alert
                        message="Chưa có dữ liệu Excel"
                        description="Vui lòng upload file Excel để preview template với dữ liệu thật. Template preview hiện tại sẽ hiển thị placeholder."
                        type="info"
                        showIcon
                        className="mb-4"
                      />
                    )} */}
                    <TemplateManager 
                      onSelectTemplate={handleSelectTemplate} 
                      sampleData={excelData.length > 0 ? excelData[0] : undefined}
                      onTemplatesChanged={() => setSelectedTemplate(null)}
                    />
                  </Card>
                ),
              },
              {
                                      key: 'email-config',
                      label: (
                        <span className="inline-flex items-center gap-2">
                          <SettingOutlined />
                          <span>Email Config</span>
                        </span>
                      ),
                      children: (
                        <Card className="shadow-lg" styles={{ body: { padding: '24px' } }}>
                          <EmailConfigManager onConfigChange={() => {
                            // Khi thay đổi config ở tab, reload configs tại EmailSender bằng sự kiện focus
                            window.dispatchEvent(new Event('focus'))
                          }} />
                        </Card>
                      ),
                    },
                    {
                      key: 'delay-settings',
                      label: (
                        <span className="inline-flex items-center gap-2">
                          <ClockCircleOutlined />
                          <span>Delay Settings</span>
                        </span>
                      ),
                      children: (
                        <DelaySettings onSettingsChange={handleDelaySettingsChange} />
                      ),
                    },
            ]}
          />
        </div>
      </Content>

      {/* Preview Email Modal */}
            <Modal
        title={
          <div className="text-blue-600 font-medium text-lg">
            {currentSubject ? replaceVariables(currentSubject, selectedRecord) : 'Preview Email'}
          </div>
        }
        open={previewModalOpen}
        onCancel={() => setPreviewModalOpen(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setPreviewModalOpen(false)}>
            Đóng
          </Button>
        ]}
      >
        <div>
          {/* Content */}
          <div
            dangerouslySetInnerHTML={{ __html: previewContent }}
            style={{
              border: 'none',
              borderRadius: '8px',
              padding: '0',
              backgroundColor: 'white',
              maxHeight: '400px',
              overflow: 'auto'
            }}
          />
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        title="Lịch sử gửi email"
        open={historyModalOpen}
        onCancel={() => setHistoryModalOpen(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setHistoryModalOpen(false)}>
            Đóng
          </Button>
        ]}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Text className="whitespace-nowrap">Lọc theo ngày:</Text>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={historyFilterDate ?? getLocalDateString()}
              onChange={(e) => { setHistoryPage(1); setHistoryFilterDate(e.target.value || getLocalDateString()) }}
            />
            <Button onClick={() => { setHistoryPage(1); setHistoryFilterDate(getLocalDateString()) }}>Hôm nay</Button>
          </div>
          <div className="flex justify-end">
            <Pagination
              current={historyPage}
              pageSize={historyPageSize}
              total={historyTotal}
              onChange={(p, ps) => fetchHistory(historyFilterDate, p, ps)}
              showSizeChanger
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
          {historyItems.length === 0 ? (
            <div className="text-center py-8">
              <Text type="secondary">Chưa có lịch sử gửi email</Text>
            </div>
          ) : (
            historyItems.map((entry) => (
              <Card key={entry.id} size="small" className="shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <Text strong>{new Date(entry.timestamp).toLocaleString('vi-VN')}</Text>
                    <div className="mt-1">
                      <Tag color="blue">Tổng: {entry.total}</Tag>
                      <Tag color="green" icon={<CheckCircleOutlined />}>
                        Thành công: {entry.success}
                      </Tag>
                      <Tag color="red" icon={<CloseCircleOutlined />}>
                        Thất bại: {entry.failed}
                      </Tag>
                    </div>
                  </div>
                  {entry.status === 'inProgress' && stopHandlers[entry.id] && (
                    <Button danger onClick={() => stopHandlers[entry.id]?.()}>Dừng gửi</Button>
                  )}
                </div>
                
                <div className="max-h-32 overflow-y-auto">
                  {entry.results.map((result: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-1 text-sm">
                      <span>{result.email}</span>
                      <Tag 
                        color={result.status === 'success' ? 'green' : 'red'}
                      >
                        {result.status === 'success' ? 'Thành công' : 'Thất bại'}
                      </Tag>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      </Modal>
    </Layout>
  )
}
