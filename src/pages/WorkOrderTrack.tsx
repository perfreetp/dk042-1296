import { useState, useMemo } from 'react'
import { Row, Col, Card, Table, Tag, Tabs, Progress, List, Select, DatePicker } from 'antd'
import {
  FileTextOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { mockStations, mockWorkOrders, mockGuns } from '../mock'
import type { WorkOrder } from '../types'

const { RangePicker } = DatePicker

interface Props {
  selectedArea: string
}

function WorkOrderTrack({ selectedArea }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')

  const filteredStations = useMemo(() => {
    if (selectedArea === 'all') return mockStations
    return mockStations.filter(s => s.area === selectedArea)
  }, [selectedArea])

  const filteredOrders = useMemo(() => {
    let orders = mockWorkOrders.filter(wo => {
      const station = filteredStations.find(s => s.id === wo.stationId)
      return !!station
    })
    if (statusFilter !== 'all') {
      orders = orders.filter(wo => wo.status === statusFilter)
    }
    if (levelFilter !== 'all') {
      orders = orders.filter(wo => wo.level === levelFilter)
    }
    return orders
  }, [filteredStations, statusFilter, levelFilter])

  const stats = useMemo(() => {
    const total = filteredOrders.length
    const pending = filteredOrders.filter(wo => wo.status === 'pending').length
    const processing = filteredOrders.filter(wo => wo.status === 'processing').length
    const completed = filteredOrders.filter(wo => wo.status === 'completed' || wo.status === 'closed').length
    const highLevel = filteredOrders.filter(wo => wo.level === 'high').length
    const recurrenceCount = filteredOrders.filter(wo => wo.recurrence > 0).length

    const completedOrders = filteredOrders.filter(wo => wo.completeTime)
    const avgResponseTime = completedOrders.length > 0
      ? Math.round(completedOrders.reduce((sum, wo) => {
          const diff = new Date(wo.assignTime).getTime() - new Date(wo.createTime).getTime()
          return sum + diff / (1000 * 60)
        }, 0) / completedOrders.length)
      : 0

    const avgCompleteTime = completedOrders.length > 0
      ? Math.round(completedOrders.reduce((sum, wo) => {
          const diff = new Date(wo.completeTime).getTime() - new Date(wo.createTime).getTime()
          return sum + diff / (1000 * 60)
        }, 0) / completedOrders.length)
      : 0

    return { total, pending, processing, completed, highLevel, recurrenceCount, avgResponseTime, avgCompleteTime }
  }, [filteredOrders])

  const highRecurrencePoints = useMemo(() => {
    const gunMap = new Map<string, { count: number; orders: WorkOrder[]; stationName: string; gunNo: string }>()

    filteredOrders.forEach(wo => {
      if (!gunMap.has(wo.gunId)) {
        gunMap.set(wo.gunId, { count: 0, orders: [], stationName: wo.stationName, gunNo: wo.gunNo })
      }
      const data = gunMap.get(wo.gunId)!
      data.count++
      data.orders.push(wo)
    })

    return Array.from(gunMap.entries())
      .map(([gunId, data]) => ({
        gunId,
        ...data,
        latestTime: data.orders.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())[0]?.createTime,
      }))
      .filter(d => d.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [filteredOrders])

  const handlerEfficiency = useMemo(() => {
    const handlerMap = new Map<string, { total: number; completed: number; avgResponse: number[]; avgComplete: number[] }>()

    filteredOrders.forEach(wo => {
      if (!handlerMap.has(wo.handler)) {
        handlerMap.set(wo.handler, { total: 0, completed: 0, avgResponse: [], avgComplete: [] })
      }
      const data = handlerMap.get(wo.handler)!
      data.total++

      if (wo.status === 'completed' || wo.status === 'closed') {
        data.completed++
        const responseTime = (new Date(wo.assignTime).getTime() - new Date(wo.createTime).getTime()) / (1000 * 60)
        data.avgResponse.push(responseTime)
        const completeTime = (new Date(wo.completeTime).getTime() - new Date(wo.createTime).getTime()) / (1000 * 60)
        data.avgComplete.push(completeTime)
      }
    })

    return Array.from(handlerMap.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        completed: data.completed,
        completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        avgResponse: data.avgResponse.length > 0 ? Math.round(data.avgResponse.reduce((a, b) => a + b, 0) / data.avgResponse.length) : 0,
        avgComplete: data.avgComplete.length > 0 ? Math.round(data.avgComplete.reduce((a, b) => a + b, 0) / data.avgComplete.length) : 0,
      }))
      .sort((a, b) => b.completionRate - a.completionRate)
  }, [filteredOrders])

  const statusPieOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '工单状态',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
        },
        data: [
          { value: stats.pending, name: '待处理', itemStyle: { color: '#faad14' } },
          { value: stats.processing, name: '处理中', itemStyle: { color: '#1677ff' } },
          { value: stats.completed, name: '已完成', itemStyle: { color: '#52c41a' } },
        ],
      },
    ],
  }), [stats])

  const typeBarOption = useMemo(() => {
    const typeMap = new Map<string, number>()
    filteredOrders.forEach(wo => {
      typeMap.set(wo.type, (typeMap.get(wo.type) || 0) + 1)
    })
    const types = Array.from(typeMap.keys())
    const counts = types.map(t => typeMap.get(t) || 0)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '5%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: types,
        axisLabel: {
          rotate: 15,
          fontSize: 11,
        },
      },
      yAxis: {
        type: 'value',
        name: '工单数量',
      },
      series: [
        {
          name: '工单数',
          type: 'bar',
          data: counts,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#1677ff' },
                { offset: 1, color: '#69b1ff' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '50%',
        },
      ],
    }
  }, [filteredOrders])

  const trendOption = useMemo(() => {
    const days = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      days.push(dayjs(d).format('MM-DD'))
    }

    const dailyCounts = days.map((_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (29 - i))
      const dayStr = d.toISOString().split('T')[0]
      return filteredOrders.filter(wo => wo.createTime.startsWith(dayStr)).length
    })

    return {
      tooltip: {
        trigger: 'axis',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: days,
      },
      yAxis: {
        type: 'value',
        name: '工单数量',
      },
      series: [
        {
          name: '新增工单',
          type: 'line',
          smooth: true,
          data: dailyCounts,
          itemStyle: { color: '#ff4d4f' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255, 77, 79, 0.3)' },
                { offset: 1, color: 'rgba(255, 77, 79, 0.05)' },
              ],
            },
          },
        },
      ],
    }
  }, [filteredOrders])

  const orderColumns = [
    {
      title: '工单编号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '所属站点',
      dataIndex: 'stationName',
      key: 'stationName',
    },
    {
      title: '枪位',
      dataIndex: 'gunNo',
      key: 'gunNo',
      width: 80,
    },
    {
      title: '故障类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: WorkOrder['level']) => {
        const colorMap = { low: 'blue', medium: 'orange', high: 'red' }
        const textMap = { low: '低', medium: '中', high: '高' }
        return <Tag color={colorMap[level]}>{textMap[level]}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: WorkOrder['status']) => {
        const colorMap = { pending: 'orange', processing: 'blue', completed: 'green', closed: 'default' }
        const textMap = { pending: '待处理', processing: '处理中', completed: '已完成', closed: '已关闭' }
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>
      },
    },
    {
      title: '处理人',
      dataIndex: 'handler',
      key: 'handler',
      width: 100,
    },
    {
      title: '复发次数',
      dataIndex: 'recurrence',
      key: 'recurrence',
      width: 90,
      sorter: (a: WorkOrder, b: WorkOrder) => a.recurrence - b.recurrence,
      render: (val: number) => val > 0 ? <Tag color="red">{val}次</Tag> : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
    },
  ]

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#666' }}>工单状态：</span>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'pending', label: '待处理' },
              { value: 'processing', label: '处理中' },
              { value: 'completed', label: '已完成' },
              { value: 'closed', label: '已关闭' },
            ]}
          />
          <span style={{ color: '#666', marginLeft: 16 }}>故障级别：</span>
          <Select
            value={levelFilter}
            onChange={setLevelFilter}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: '全部级别' },
              { value: 'high', label: '高级' },
              { value: 'medium', label: '中级' },
              { value: 'low', label: '低级' },
            ]}
          />
          <RangePicker
            style={{ marginLeft: 16 }}
            defaultValue={[dayjs().subtract(30, 'day'), dayjs()]}
          />
        </div>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card>
            <StatCard
              icon={<FileTextOutlined style={{ color: '#1677ff' }} />}
              title="工单总数"
              value={stats.total}
              unit="个"
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <StatCard
              icon={<WarningOutlined style={{ color: '#faad14' }} />}
              title="待处理"
              value={stats.pending}
              unit="个"
              color="#faad14"
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <StatCard
              icon={<ClockCircleOutlined style={{ color: '#1677ff' }} />}
              title="处理中"
              value={stats.processing}
              unit="个"
              color="#1677ff"
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <StatCard
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              title="已完成"
              value={stats.completed}
              unit="个"
              color="#52c41a"
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <StatCard
              icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              title="高频复发点"
              value={stats.recurrenceCount}
              unit="个"
              color="#ff4d4f"
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <StatCard
              icon={<ReloadOutlined style={{ color: '#722ed1' }} />}
              title="平均响应"
              value={stats.avgResponseTime}
              unit="分钟"
              color="#722ed1"
            />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="1">
        <Tabs.TabPane tab="工单总览" key="1">
          <Row gutter={16}>
            <Col span={8}>
              <Card
                title={
                  <div className="card-section-title">
                    <FileTextOutlined style={{ color: '#1677ff' }} />
                    工单状态分布
                  </div>
                }
              >
                <ReactECharts option={statusPieOption} style={{ height: 280 }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card
                title={
                  <div className="card-section-title">
                    <WarningOutlined style={{ color: '#faad14' }} />
                    故障类型分布
                  </div>
                }
              >
                <ReactECharts option={typeBarOption} style={{ height: 280 }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card
                title={
                  <div className="card-section-title">
                    <ClockCircleOutlined style={{ color: '#1677ff' }} />
                    30天工单趋势
                  </div>
                }
              >
                <ReactECharts option={trendOption} style={{ height: 280 }} />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane tab="高频复发点" key="2">
          <Row gutter={16}>
            <Col span={10}>
              <Card
                title={
                  <div className="card-section-title">
                    <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                    高频复发枪位TOP10
                  </div>
                }
                extra={<Tag color="red">需重点关注</Tag>}
              >
                <List
                  dataSource={highRecurrencePoints}
                  renderItem={(item, index) => (
                    <List.Item>
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: index < 3 ? '#ff4d4f' : '#faad14',
                          color: '#fff', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 13, fontWeight: 'bold',
                          marginRight: 12,
                        }}>
                          {index + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>
                            {item.stationName} - {item.gunNo}
                          </div>
                          <div style={{ fontSize: 12, color: '#999' }}>
                            最近一次：{item.latestTime?.slice(0, 10)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 20, fontWeight: 'bold', color: '#ff4d4f' }}>
                            {item.count}
                            <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>次</span>
                          </div>
                          <Tag color="red">复发</Tag>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={14}>
              <Card
                title={
                  <div className="card-section-title">
                    <ReloadOutlined style={{ color: '#722ed1' }} />
                    复发工单详情
                  </div>
                }
              >
                <Table
                  columns={orderColumns}
                  dataSource={filteredOrders.filter(wo => wo.recurrence > 0).sort((a, b) => b.recurrence - a.recurrence)}
                  rowKey="id"
                  pagination={{ pageSize: 6 }}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane tab="处理效率" key="3">
          <Row gutter={16}>
            <Col span={10}>
              <Card
                title={
                  <div className="card-section-title">
                    <UserOutlined style={{ color: '#1677ff' }} />
                    责任人处理效率排行
                  </div>
                }
              >
                <List
                  dataSource={handlerEfficiency}
                  renderItem={(item, index) => (
                    <List.Item>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: index < 3 ? '#faad14' : '#d9d9d9',
                            color: '#fff', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 12, fontWeight: 'bold',
                            marginRight: 10,
                          }}>
                            {index + 1}
                          </span>
                          <span style={{ fontWeight: 500, flex: 1 }}>{item.name}</span>
                          <span style={{
                            fontSize: 16, fontWeight: 'bold',
                            color: item.completionRate >= 90 ? '#52c41a' : item.completionRate >= 70 ? '#faad14' : '#ff4d4f'
                          }}>
                            {item.completionRate}%
                          </span>
                        </div>
                        <Progress
                          percent={item.completionRate}
                          size="small"
                          strokeColor={item.completionRate >= 90 ? '#52c41a' : item.completionRate >= 70 ? '#faad14' : '#ff4d4f'}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: '#999' }}>
                          <span>完成 {item.completed}/{item.total}</span>
                          <span>平均响应 {item.avgResponse}分钟</span>
                          <span>平均处理 {Math.round(item.avgComplete / 60)}小时</span>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={14}>
              <Card
                title={
                  <div className="card-section-title">
                    <FileTextOutlined style={{ color: '#1677ff' }} />
                    全部工单列表
                  </div>
                }
              >
                <Table
                  columns={orderColumns}
                  dataSource={filteredOrders}
                  rowKey="id"
                  pagination={{ pageSize: 8 }}
                />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>
      </Tabs>
    </div>
  )
}

function StatCard({ icon, title, value, unit, color }: {
  icon: React.ReactNode
  title: string
  value: number
  unit: string
  color?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: color ? `${color}15` : '#f0f5ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#8c8c8c' }}>{title}</div>
        <div style={{ fontSize: 22, fontWeight: 'bold', color: color || '#262626' }}>
          {value}<span style={{ fontSize: 12, fontWeight: 'normal', color: '#999', marginLeft: 4 }}>{unit}</span>
        </div>
      </div>
    </div>
  )
}

export default WorkOrderTrack
