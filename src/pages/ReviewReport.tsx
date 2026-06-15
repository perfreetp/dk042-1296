import { useState, useMemo } from 'react'
import {
  Row, Col, Card, Button, Tabs, List, Tag, Progress, Modal, Form,
  Input, Select, DatePicker, message, Divider, Space, Descriptions,
} from 'antd'
import {
  FileSearchOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  FileTextOutlined,
  EditOutlined,
  PlusOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  UserOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { mockRectifications, mockStations, mockGuns, mockTempRecords, mockStationRanks, mockWorkOrders } from '../mock'
import type { Rectification } from '../types'

const { TextArea } = Input
const { RangePicker } = DatePicker

interface Props {
  selectedArea: string
}

function ReviewReport({ selectedArea }: Props) {
  const [selectedRectification, setSelectedRectification] = useState<Rectification | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [generateModalVisible, setGenerateModalVisible] = useState(false)
  const [form] = Form.useForm()

  const filteredRectifications = useMemo(() => {
    if (selectedArea === 'all') return mockRectifications
    const stationIds = mockStations.filter(s => s.area === selectedArea).map(s => s.id)
    return mockRectifications.filter(r => stationIds.includes(r.stationId))
  }, [selectedArea])

  const stats = useMemo(() => {
    const total = filteredRectifications.length
    const effective = filteredRectifications.filter(r => r.afterTemp < r.beforeTemp * 0.7).length
    const avgTempDrop = total > 0
      ? (filteredRectifications.reduce((sum, r) => sum + (r.beforeTemp - r.afterTemp), 0) / total).toFixed(1)
      : '0'

    return { total, effective, avgTempDrop }
  }, [filteredRectifications])

  const monthlyTrendOption = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      months.push(dayjs(d).format('YYYY-MM'))
    }

    const rectifyCounts = months.map(() => Math.floor(Math.random() * 8) + 3)
    const effectiveRate = rectifyCounts.map(() => Math.floor(Math.random() * 30) + 65)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['整改数量', '整改有效率'],
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: months,
      },
      yAxis: [
        {
          type: 'value',
          name: '数量',
          position: 'left',
        },
        {
          type: 'value',
          name: '有效率(%)',
          position: 'right',
          max: 100,
        },
      ],
      series: [
        {
          name: '整改数量',
          type: 'bar',
          data: rectifyCounts,
          itemStyle: {
            color: '#1677ff',
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '40%',
          yAxisIndex: 0,
        },
        {
          name: '整改有效率',
          type: 'line',
          data: effectiveRate,
          smooth: true,
          itemStyle: { color: '#52c41a' },
          yAxisIndex: 1,
        },
      ],
    }
  }, [])

  const beforeAfterCompareOption = (rect: Rectification) => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['整改前', '整改后'],
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['最高温度', '平均温度', '故障频率'],
    },
    yAxis: {
      type: 'value',
      name: '数值',
    },
    series: [
      {
        name: '整改前',
        type: 'bar',
        data: [rect.beforeTemp, rect.beforeTemp - 10, 5],
        itemStyle: { color: '#ff4d4f' },
        barWidth: '30%',
      },
      {
        name: '整改后',
        type: 'bar',
        data: [rect.afterTemp, rect.afterTemp - 5, 1],
        itemStyle: { color: '#52c41a' },
        barWidth: '30%',
      },
    ],
  })

  const handleGenerateReport = () => {
    form.validateFields().then(values => {
      message.success('区域安全复盘报告生成中...')
      setTimeout(() => {
        message.success('报告生成成功，已保存到本地')
        setGenerateModalVisible(false)
      }, 1500)
    })
  }

  const openDetail = (rect: Rectification) => {
    setSelectedRectification(rect)
    setDetailVisible(true)
  }

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <StatCard
              icon={<FileTextOutlined style={{ color: '#1677ff' }} />}
              title="累计整改案例"
              value={stats.total}
              unit="例"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <StatCard
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              title="整改有效"
              value={stats.effective}
              unit="例"
              color="#52c41a"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <StatCard
              icon={<FallOutlined style={{ color: '#52c41a' }} />}
              title="平均降温"
              value={stats.avgTempDrop}
              unit="℃"
              color="#52c41a"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Button type="primary" icon={<PlusOutlined />} block size="large" onClick={() => setGenerateModalVisible(true)}>
              生成复盘报告
            </Button>
            <Button icon={<DownloadOutlined />} block style={{ marginTop: 8 }}>
              导出历史报告
            </Button>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="1">
        <Tabs.TabPane tab="整改案例沉淀" key="1">
          <Row gutter={16}>
            <Col span={16}>
              <Card
                title={
                  <div className="card-section-title">
                    <FileSearchOutlined style={{ color: '#1677ff' }} />
                    整改案例列表
                  </div>
                }
              >
                <List
                  dataSource={filteredRectifications}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Button type="link" onClick={() => openDetail(item)}>查看详情</Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{
                            width: 50, height: 50, borderRadius: 10,
                            background: 'linear-gradient(135deg, #ff4d4f, #52c41a)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 20,
                          }}>
                            ↓
                          </div>
                        }
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontWeight: 500 }}>{item.stationName}</span>
                            <Tag color="blue">{item.issue}</Tag>
                            <Tag color="green">整改有效</Tag>
                          </div>
                        }
                        description={
                          <div style={{ display: 'flex', gap: 24, marginTop: 4 }}>
                            <span><CalendarOutlined style={{ marginRight: 4 }} />{item.rectifyTime?.slice(0, 10)}</span>
                            <span><UserOutlined style={{ marginRight: 4 }} />{item.operator}</span>
                            <span>
                              温度: 
                              <span style={{ color: '#ff4d4f', fontWeight: 'bold', marginLeft: 4 }}>
                                {item.beforeTemp.toFixed(1)}℃
                              </span>
                              <ArrowRightOutlined style={{ margin: '0 8px', fontSize: 12, color: '#999' }} />
                              <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                                {item.afterTemp.toFixed(1)}℃
                              </span>
                            </span>
                            <span style={{ color: '#52c41a' }}>
                              下降 {((item.beforeTemp - item.afterTemp) / item.beforeTemp * 100).toFixed(1)}%
                            </span>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                  pagination={{ pageSize: 6 }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card
                title={
                  <div className="card-section-title">
                    <RiseOutlined style={{ color: '#faad14' }} />
                    月度整改趋势
                  </div>
                }
              >
                <ReactECharts option={monthlyTrendOption} style={{ height: 280 }} />
              </Card>

              <Card
                title={
                  <div className="card-section-title">
                    <FileTextOutlined style={{ color: '#722ed1' }} />
                    典型整改方案
                  </div>
                }
                style={{ marginTop: 16 }}
              >
                <List
                  size="small"
                  dataSource={[
                    { title: '枪线散热模块更换', count: 8, desc: '针对高频过热问题' },
                    { title: '连接器清洁保养', count: 12, desc: '预防接触不良导致过热' },
                    { title: '通风系统优化', count: 5, desc: '改善机柜散热条件' },
                    { title: '功率模块升级', count: 3, desc: '更换老化功率组件' },
                  ]}
                  renderItem={item => (
                    <List.Item>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>{item.desc}</div>
                      </div>
                      <Tag color="blue">{item.count}次应用</Tag>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane tab="整改前后对照" key="2">
          <Row gutter={16}>
            {filteredRectifications.slice(0, 6).map(rect => (
              <Col span={8} key={rect.id}>
                <Card
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{rect.stationName}</span>
                      <Tag color="blue">{rect.issue}</Tag>
                    </div>
                  }
                  size="small"
                  extra={<Button type="link" size="small" onClick={() => openDetail(rect)}>详情</Button>}
                  style={{ marginBottom: 16 }}
                >
                  <ReactECharts option={beforeAfterCompareOption(rect)} style={{ height: 200 }} />
                  <Divider style={{ margin: '12px 0' }} />
                  <Row gutter={16}>
                    <Col span={12} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>整改前</div>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                        {rect.beforeTemp.toFixed(1)}℃
                      </div>
                    </Col>
                    <Col span={12} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>整改后</div>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                        {rect.afterTemp.toFixed(1)}℃
                      </div>
                    </Col>
                  </Row>
                  <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                      温度下降 {((rect.beforeTemp - rect.afterTemp) / rect.beforeTemp * 100).toFixed(1)}%
                    </Tag>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane tab="区域安全复盘" key="3">
          <Card
            title={
              <div className="card-section-title">
                <FileSearchOutlined style={{ color: '#1677ff' }} />
                区域安全复盘材料模板
              </div>
            }
            extra={
              <Space>
                <Button icon={<EditOutlined />}>编辑模板</Button>
                <Button type="primary" icon={<DownloadOutlined />} onClick={() => setGenerateModalVisible(true)}>
                  生成报告
                </Button>
              </Space>
            }
          >
            <div style={{ background: '#fafafa', padding: 24, borderRadius: 8 }}>
              <h2 style={{ textAlign: 'center', marginBottom: 24 }}>
                {selectedArea === 'all' ? '全区域' : selectedArea}充电站安全运营复盘报告
              </h2>
              <p style={{ textAlign: 'right', color: '#999', marginBottom: 24 }}>
                报告周期：{dayjs().subtract(30, 'day').format('YYYY-MM-DD')} 至 {dayjs().format('YYYY-MM-DD')}
              </p>

              <Divider orientation="left">一、总体情况</Divider>
              <p>
                本期覆盖 {mockStations.filter(s => selectedArea === 'all' || s.area === selectedArea).length} 个充电站，
                共计 {mockGuns.filter(g => {
                  if (selectedArea === 'all') return true
                  const station = mockStations.find(s => s.id === g.stationId)
                  return station?.area === selectedArea
                }).length} 个充电枪位。
                本月累计发生 {mockWorkOrders.filter(wo => {
                  if (selectedArea === 'all') return true
                  const station = mockStations.find(s => s.id === wo.stationId)
                  return station?.area === selectedArea
                }).length} 起设备故障工单，
                较上月 {Math.random() > 0.5 ? '上升' : '下降'} {Math.floor(Math.random() * 30) + 5}%。
              </p>

              <Divider orientation="left">二、高温风险分析</Divider>
              <p>
                本月高温枪位（{' > '}60℃）共 {mockGuns.filter(g => g.status === 'danger' && (selectedArea === 'all' || mockStations.find(s => s.id === g.stationId)?.area === selectedArea)).length} 个，
                占总枪位数的 {((mockGuns.filter(g => g.status === 'danger' && (selectedArea === 'all' || mockStations.find(s => s.id === g.stationId)?.area === selectedArea)).length / mockGuns.filter(g => selectedArea === 'all' || mockStations.find(s => s.id === g.stationId)?.area === selectedArea).length) * 100).toFixed(1)}%。
                主要集中在以下站点：
                {mockStations.filter(s => s.highTempGuns > 2 && (selectedArea === 'all' || s.area === selectedArea)).map(s => s.name).join('、')}。
              </p>
              <p>
                从设备型号来看，{['比亚迪DC-120kW', '特斯拉V3-250kW'][Math.floor(Math.random() * 2)]} 系列设备温升问题较为突出，
                建议重点关注。
              </p>

              <Divider orientation="left">三、工单处理效率</Divider>
              <p>
                本月工单平均响应时间 {Math.floor(Math.random() * 30) + 20} 分钟，
                平均处理时长 {Math.floor(Math.random() * 12) + 4} 小时，
                工单完成率 {Math.floor(Math.random() * 20) + 75}%。
              </p>
              <p>
                高频复发故障点共 {Math.floor(Math.random() * 5) + 3} 个，
                主要问题类型为枪线过热和连接器故障。
                建议对复发点进行专项整改。
              </p>

              <Divider orientation="left">四、对标排名情况</Divider>
              <p>
                综合排名前三的站点为：
                {mockStationRanks.slice(0, 3).map(r => r.stationName).join('、')}。
                排名靠后的站点需加强日常巡检和维护工作。
              </p>

              <Divider orientation="left">五、整改措施与成效</Divider>
              <p>
                本月完成整改 {filteredRectifications.length} 项，
                整改有效率 {((stats.effective / stats.total) * 100).toFixed(0)}%，
                平均温度下降 {stats.avgTempDrop}℃。
              </p>
              <p>
                典型案例：
              </p>
              <ul style={{ paddingLeft: 20 }}>
                {filteredRectifications.slice(0, 3).map(r => (
                  <li key={r.id} style={{ marginBottom: 8 }}>
                    {r.stationName} - {r.issue}：温度从 {r.beforeTemp.toFixed(1)}℃ 降至 {r.afterTemp.toFixed(1)}℃
                  </li>
                ))}
              </ul>

              <Divider orientation="left">六、下一步工作计划</Divider>
              <ul style={{ paddingLeft: 20 }}>
                <li>对排名后三位的站点进行专项督导</li>
                <li>开展高温枪位专项整治行动</li>
                <li>优化工单响应流程，缩短处理时间</li>
                <li>加强运维人员培训，提升专业技能</li>
                <li>建立复发故障跟踪机制，确保整改到位</li>
              </ul>

              <div style={{ textAlign: 'right', marginTop: 40, color: '#999' }}>
                <p>报告生成时间：{dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
                <p>报告人：区域经理</p>
              </div>
            </div>
          </Card>
        </Tabs.TabPane>
      </Tabs>

      <Modal
        title="整改案例详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={900}
      >
        {selectedRectification && (
          <div>
            <Descriptions
              title={selectedRectification.stationName}
              bordered
              column={2}
              size="small"
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="故障类型">{selectedRectification.issue}</Descriptions.Item>
              <Descriptions.Item label="整改时间">{selectedRectification.rectifyTime?.slice(0, 10)}</Descriptions.Item>
              <Descriptions.Item label="操作人">{selectedRectification.operator}</Descriptions.Item>
              <Descriptions.Item label="枪位编号">{selectedRectification.gunId}</Descriptions.Item>
              <Descriptions.Item label="整改前温度" span={1}>
                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                  {selectedRectification.beforeTemp.toFixed(1)}℃
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="整改后温度" span={1}>
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  {selectedRectification.afterTemp.toFixed(1)}℃
                </span>
              </Descriptions.Item>
            </Descriptions>

            <ReactECharts
              option={beforeAfterCompareOption(selectedRectification)}
              style={{ height: 250 }}
            />

            <Divider />

            <Row gutter={16}>
              <Col span={12}>
                <div style={{ padding: 16, background: '#fff1f0', borderRadius: 8 }}>
                  <h4 style={{ color: '#ff4d4f', marginBottom: 8 }}>整改前</h4>
                  <p style={{ fontSize: 13, color: '#666' }}>{selectedRectification.beforeDesc}</p>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: 16, background: '#f6ffed', borderRadius: 8 }}>
                  <h4 style={{ color: '#52c41a', marginBottom: 8 }}>整改后</h4>
                  <p style={{ fontSize: 13, color: '#666' }}>{selectedRectification.afterDesc}</p>
                </div>
              </Col>
            </Row>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Progress
                type="dashboard"
                percent={Math.round(((selectedRectification.beforeTemp - selectedRectification.afterTemp) / selectedRectification.beforeTemp) * 100)}
                strokeColor="#52c41a"
                format={percent => `温度下降 ${percent}%`}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="生成区域安全复盘报告"
        open={generateModalVisible}
        onCancel={() => setGenerateModalVisible(false)}
        onOk={handleGenerateReport}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="reportTitle"
            label="报告标题"
            rules={[{ required: true, message: '请输入报告标题' }]}
          >
            <Input placeholder="请输入报告标题" defaultValue={`${selectedArea === 'all' ? '全区域' : selectedArea}充电站安全运营复盘报告`} />
          </Form.Item>
          <Form.Item
            name="dateRange"
            label="统计周期"
            rules={[{ required: true, message: '请选择统计周期' }]}
          >
            <RangePicker style={{ width: '100%' }} defaultValue={[dayjs().subtract(30, 'day'), dayjs()]} />
          </Form.Item>
          <Form.Item name="reportType" label="报告类型">
            <Select
              options={[
                { value: 'monthly', label: '月度复盘报告' },
                { value: 'quarterly', label: '季度复盘报告' },
                { value: 'special', label: '专项整改报告' },
                { value: 'custom', label: '自定义报告' },
              ]}
              defaultValue="monthly"
            />
          </Form.Item>
          <Form.Item name="includeSections" label="包含内容">
            <Select
              mode="multiple"
              placeholder="请选择要包含的内容"
              options={[
                { value: 'overview', label: '总体情况' },
                { value: 'tempAnalysis', label: '高温风险分析' },
                { value: 'workOrder', label: '工单处理效率' },
                { value: 'ranking', label: '对标排名情况' },
                { value: 'rectification', label: '整改措施与成效' },
                { value: 'plan', label: '下一步工作计划' },
              ]}
              defaultValue={['overview', 'tempAnalysis', 'workOrder', 'ranking', 'rectification', 'plan']}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="format" label="导出格式">
            <Select
              options={[
                { value: 'pdf', label: 'PDF格式' },
                { value: 'word', label: 'Word格式' },
                { value: 'excel', label: 'Excel格式' },
              ]}
              defaultValue="pdf"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function StatCard({ icon, title, value, unit, color }: {
  icon: React.ReactNode
  title: string
  value: number | string
  unit: string
  color?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: color ? `${color}15` : '#f0f5ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, color: '#8c8c8c' }}>{title}</div>
        <div style={{ fontSize: 24, fontWeight: 'bold', color: color || '#262626' }}>
          {value}<span style={{ fontSize: 13, fontWeight: 'normal', color: '#999', marginLeft: 4 }}>{unit}</span>
        </div>
      </div>
    </div>
  )
}

export default ReviewReport
