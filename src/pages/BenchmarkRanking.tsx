import { useState, useMemo, useEffect } from 'react'
import {
  Row, Col, Card, Table, Tag, Button, Select, Progress, List,
  Alert, Space, Radio, Tabs, Badge, message, Modal, Form, Input, Dropdown, MenuProps,
} from 'antd'
import {
  TrophyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExportOutlined,
  WarningOutlined,
  FireOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  StarOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { mockStationRanks, mockStations, mockGuns, mockWorkOrders } from '../mock'
import { downloadCSV } from '../utils/export'
import type { StationRank } from '../types'

interface ViewPreset {
  id: string
  name: string
  area: string
  sortBy: string
  viewMode: string
  createTime: string
}

interface Props {
  selectedArea: string
  onAreaChange?: (area: string) => void
}

const STORAGE_KEY = 'benchmark_view_presets'

function BenchmarkRanking({ selectedArea, onAreaChange }: Props) {
  const [sortBy, setSortBy] = useState<'score' | 'highTemp' | 'workOrder' | 'completion' | 'response'>('score')
  const [viewMode, setViewMode] = useState<'rank' | 'compare' | 'maintenance'>('rank')
  const [presets, setPresets] = useState<ViewPreset[]>([])
  const [saveModalVisible, setSaveModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [activePresetArea, setActivePresetArea] = useState<string>(selectedArea)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setPresets(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load presets')
      }
    }
  }, [])

  const savePresets = (newPresets: ViewPreset[]) => {
    setPresets(newPresets)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets))
  }

  const handleSavePreset = () => {
    form.validateFields().then(values => {
      const newPreset: ViewPreset = {
        id: `PRESET_${Date.now()}`,
        name: values.name,
        area: selectedArea,
        sortBy,
        viewMode,
        createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      }
      savePresets([newPreset, ...presets])
      message.success(`已保存视图方案：${values.name}`)
      setSaveModalVisible(false)
      form.resetFields()
    })
  }

  const handleApplyPreset = (preset: ViewPreset) => {
    if (preset.area !== activePresetArea) {
      setActivePresetArea(preset.area)
      if (onAreaChange) {
        onAreaChange(preset.area)
      }
    }
    if (preset.viewMode !== viewMode) {
      setViewMode(preset.viewMode as any)
    }
    if (preset.sortBy !== sortBy) {
      setSortBy(preset.sortBy as any)
    }
    message.success(`已切换到视图方案：${preset.name}`)
  }

  useEffect(() => {
    setActivePresetArea(selectedArea)
  }, [selectedArea])

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newPresets = presets.filter(p => p.id !== id)
    savePresets(newPresets)
    message.success('已删除视图方案')
  }

  const presetMenuItems: MenuProps['items'] = useMemo(() => [
    ...presets.map(preset => ({
      key: preset.id,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div onClick={() => handleApplyPreset(preset)} style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{preset.name}</div>
            <div style={{ fontSize: 11, color: '#999' }}>
              {preset.area === 'all' ? '全区域' : preset.area} · 
              {{ score: '综合得分', highTemp: '高温优先', workOrder: '工单优先', completion: '完成率优先', response: '响应优先' }[preset.sortBy]} · 
              {{ rank: '综合排名', compare: '多维度对比', maintenance: '维护筛查' }[preset.viewMode]}
            </div>
          </div>
          <DeleteOutlined
            style={{ color: '#ff4d4f', fontSize: 14 }}
            onClick={(e) => handleDeletePreset(preset.id, e)}
          />
        </div>
      ),
    })),
    ...(presets.length > 0 ? [{ type: 'divider' as const }] : []),
    {
      key: 'save',
      label: (
        <div style={{ color: '#1677ff' }} onClick={() => setSaveModalVisible(true)}>
          <SaveOutlined style={{ marginRight: 8 }} />
          保存当前视图为新方案
        </div>
      ),
    },
  ], [presets])

  const filteredRanks = useMemo(() => {
    let ranks = mockStationRanks
    if (activePresetArea !== 'all') {
      ranks = ranks.filter(r => r.area === activePresetArea)
    }

    switch (sortBy) {
      case 'highTemp':
        return [...ranks].sort((a, b) => b.highTempCount - a.highTempCount)
      case 'workOrder':
        return [...ranks].sort((a, b) => b.workOrderCount - a.workOrderCount)
      case 'completion':
        return [...ranks].sort((a, b) => b.completionRate - a.completionRate)
      case 'response':
        return [...ranks].sort((a, b) => a.avgResponseTime - b.avgResponseTime)
      default:
        return [...ranks].sort((a, b) => b.score - a.score)
    }
  }, [activePresetArea, sortBy])

  const poorMaintenanceStations = useMemo(() => {
    return filteredRanks.filter(r =>
      r.score < 70 || r.highTempCount > 3 || r.completionRate < 75
    )
  }, [filteredRanks])

  const rankChartOption = useMemo(() => {
    const top10 = filteredRanks.slice(0, 10)
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
        type: 'value',
        max: 100,
        name: '综合得分',
      },
      yAxis: {
        type: 'category',
        data: top10.map(r => r.stationName).reverse(),
        axisLabel: {
          fontSize: 11,
        },
      },
      series: [
        {
          name: '综合得分',
          type: 'bar',
          data: top10.map((r, i) => ({
            value: r.score,
            itemStyle: {
              color: i < 3 ? '#faad14' : '#1677ff',
              borderRadius: [0, 4, 4, 0],
            },
          })).reverse(),
          label: {
            show: true,
            position: 'right',
            formatter: '{c}分',
            fontSize: 11,
          },
          barWidth: '60%',
        },
      ],
    }
  }, [filteredRanks])

  const multiDimensionChart = useMemo(() => {
    const bottom5 = [...filteredRanks].sort((a, b) => a.score - b.score).slice(0, 5)
    const top5 = filteredRanks.slice(0, 5)
    const compareStations = [...top5, ...bottom5]

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['高温枪位数', '工单数量', '完成率(%)', '响应时间(分钟)'],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '5%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: compareStations.map(r => r.stationName),
        axisLabel: {
          rotate: 25,
          fontSize: 10,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '数量/百分比',
          position: 'left',
        },
        {
          type: 'value',
          name: '响应时间(分)',
          position: 'right',
        },
      ],
      series: [
        {
          name: '高温枪位数',
          type: 'bar',
          data: compareStations.map(r => r.highTempCount),
          itemStyle: { color: '#ff4d4f' },
          yAxisIndex: 0,
        },
        {
          name: '工单数量',
          type: 'bar',
          data: compareStations.map(r => r.workOrderCount),
          itemStyle: { color: '#faad14' },
          yAxisIndex: 0,
        },
        {
          name: '完成率(%)',
          type: 'bar',
          data: compareStations.map(r => r.completionRate),
          itemStyle: { color: '#52c41a' },
          yAxisIndex: 0,
        },
        {
          name: '响应时间(分钟)',
          type: 'line',
          data: compareStations.map(r => r.avgResponseTime),
          itemStyle: { color: '#722ed1' },
          smooth: true,
          yAxisIndex: 1,
        },
      ],
    }
  }, [filteredRanks])

  const rankColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (_: any, __: any, index: number) => {
        const rank = index + 1
        if (rank <= 3) {
          return (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: rank === 1 ? '#faad14' : rank === 2 ? '#bfbfbf' : '#d48806',
              color: '#fff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 'bold', fontSize: 14,
            }}>
              {rank}
            </div>
          )
        }
        return <span style={{ color: '#999' }}>{rank}</span>
      },
    },
    {
      title: '站点名称',
      dataIndex: 'stationName',
      key: 'stationName',
      render: (text: string, record: StationRank) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.area} · {record.manager}</div>
        </div>
      ),
    },
    {
      title: '综合得分',
      dataIndex: 'score',
      key: 'score',
      width: 180,
      sorter: (a: StationRank, b: StationRank) => a.score - b.score,
      render: (score: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 18, fontWeight: 'bold',
            color: score >= 85 ? '#52c41a' : score >= 70 ? '#faad14' : '#ff4d4f'
          }}>
            {score}
          </span>
          <Progress
            percent={score}
            size="small"
            showInfo={false}
            strokeColor={score >= 85 ? '#52c41a' : score >= 70 ? '#faad14' : '#ff4d4f'}
            style={{ width: 80 }}
          />
        </div>
      ),
    },
    {
      title: '高温枪位',
      dataIndex: 'highTempCount',
      key: 'highTempCount',
      width: 100,
      sorter: (a: StationRank, b: StationRank) => a.highTempCount - b.highTempCount,
      render: (val: number) => (
        <span style={{ color: val > 2 ? '#ff4d4f' : '#666', fontWeight: val > 2 ? 'bold' : 'normal' }}>
          {val}个
        </span>
      ),
    },
    {
      title: '工单数量',
      dataIndex: 'workOrderCount',
      key: 'workOrderCount',
      width: 100,
      sorter: (a: StationRank, b: StationRank) => a.workOrderCount - b.workOrderCount,
    },
    {
      title: '工单完成率',
      dataIndex: 'completionRate',
      key: 'completionRate',
      width: 130,
      sorter: (a: StationRank, b: StationRank) => a.completionRate - b.completionRate,
      render: (val: number) => (
        <Tag color={val >= 90 ? 'green' : val >= 75 ? 'orange' : 'red'}>
          {val}%
        </Tag>
      ),
    },
    {
      title: '平均响应时间',
      dataIndex: 'avgResponseTime',
      key: 'avgResponseTime',
      width: 120,
      sorter: (a: StationRank, b: StationRank) => a.avgResponseTime - b.avgResponseTime,
      render: (val: number) => `${val}分钟`,
    },
    {
      title: '等级',
      dataIndex: 'score',
      key: 'level',
      width: 100,
      render: (score: number) => {
        if (score >= 85) return <Tag color="green">优秀</Tag>
        if (score >= 75) return <Tag color="blue">良好</Tag>
        if (score >= 60) return <Tag color="orange">合格</Tag>
        return <Tag color="red">不合格</Tag>
      },
    },
  ]

  const handleExport = () => {
    const headers = ['排名', '站点名称', '区域', '负责人', '综合得分', '高温枪位数', '工单数量', '工单完成率(%)', '平均响应时间(分钟)', '等级']
    const rows = filteredRanks.map((r, i) => {
      const level = r.score >= 85 ? '优秀' : r.score >= 75 ? '良好' : r.score >= 60 ? '合格' : '不合格'
      return [
        String(i + 1),
        r.stationName,
        r.area,
        r.manager,
        String(r.score),
        String(r.highTempCount),
        String(r.workOrderCount),
        String(r.completionRate),
        String(r.avgResponseTime),
        level,
      ]
    })
    const areaSuffix = activePresetArea === 'all' ? '全区域' : activePresetArea
    const sortByText = { score: '综合得分', highTemp: '高温优先', workOrder: '工单优先', completion: '完成率', response: '响应时间' }[sortBy]
    downloadCSV(headers, rows, `巡检排名_${areaSuffix}_${sortByText}_${dayjs().format('YYYYMMDD')}.csv`)
    message.success('巡检排名已导出为CSV文件')
  }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#666' }}>排序方式：</span>
            <Radio.Group value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <Radio.Button value="score">综合得分</Radio.Button>
              <Radio.Button value="highTemp">高温枪位</Radio.Button>
              <Radio.Button value="workOrder">工单数量</Radio.Button>
              <Radio.Button value="completion">完成率</Radio.Button>
              <Radio.Button value="response">响应时间</Radio.Button>
            </Radio.Group>
            <Dropdown menu={{ items: presetMenuItems }} trigger={['click']}>
              <Button icon={<FolderOpenOutlined />}>
                视图方案 {presets.length > 0 && <Tag color="blue" style={{ marginLeft: 4 }}>{presets.length}</Tag>}
              </Button>
            </Dropdown>
            <Button icon={<SaveOutlined />} onClick={() => setSaveModalVisible(true)}>
              保存当前视图
            </Button>
          </div>
          <Button type="primary" icon={<ExportOutlined />} onClick={handleExport}>
            导出巡检排名
          </Button>
        </div>
      </Card>

      <Tabs activeKey={viewMode} onChange={key => setViewMode(key as any)}>
        <Tabs.TabPane tab="综合排名" key="rank">
          <Row gutter={16}>
            <Col span={8}>
              <Card
                title={
                  <div className="card-section-title">
                    <TrophyOutlined style={{ color: '#faad14' }} />
                    排行榜TOP10
                  </div>
                }
              >
                <ReactECharts option={rankChartOption} style={{ height: 380 }} />
              </Card>
            </Col>
            <Col span={16}>
              <Card
                title={
                  <div className="card-section-title">
                    <FileTextOutlined style={{ color: '#1677ff' }} />
                    站点对标排行表
                  </div>
                }
              >
                <Table
                  columns={rankColumns}
                  dataSource={filteredRanks}
                  rowKey="stationId"
                  pagination={{ pageSize: 8 }}
                />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane tab="多维度对比" key="compare">
          <Row gutter={16}>
            <Col span={24}>
              <Card
                title={
                  <div className="card-section-title">
                    <BarChartIcon />
                    TOP5与后5站多维度对比
                  </div>
                }
                extra={<Tag color="blue">头尾对比，识别差距</Tag>}
              >
                <ReactECharts option={multiDimensionChart} style={{ height: 400 }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Card
                title={
                  <div className="card-section-title">
                    <TrophyOutlined style={{ color: '#52c41a' }} />
                    标杆站点（TOP3）
                  </div>
                }
              >
                <List
                  dataSource={filteredRanks.slice(0, 3)}
                  renderItem={(item, index) => (
                    <List.Item>
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%',
                          background: index === 0 ? 'linear-gradient(135deg, #faad14, #d48806)' :
                            index === 1 ? 'linear-gradient(135deg, #bfbfbf, #8c8c8c)' :
                            'linear-gradient(135deg, #d48806, #ad6800)',
                          color: '#fff', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 20, fontWeight: 'bold',
                          marginRight: 16,
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 'bold' }}>{item.stationName}</div>
                          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                            {item.area} · 负责人：{item.manager}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                            {item.score}<span style={{ fontSize: 12 }}>分</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#999' }}>
                            完成率 {item.completionRate}%
                          </div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card
                title={
                  <div className="card-section-title">
                    <WarningOutlined style={{ color: '#ff4d4f' }} />
                    待改进站点（后3）
                  </div>
                }
              >
                <List
                  dataSource={[...filteredRanks].reverse().slice(0, 3)}
                  renderItem={(item, index) => (
                    <List.Item>
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #ff7875, #ff4d4f)',
                          color: '#fff', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 18, fontWeight: 'bold',
                          marginRight: 16,
                        }}>
                          倒{index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 'bold' }}>{item.stationName}</div>
                          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                            {item.area} · 负责人：{item.manager}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                            {item.score}<span style={{ fontSize: 12 }}>分</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#ff4d4f' }}>
                            高温枪位 {item.highTempCount}个
                          </div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane tab="维护不到位筛查" key="maintenance">
          {poorMaintenanceStations.length > 0 && (
            <Alert
              message={`筛选出 ${poorMaintenanceStations.length} 个维护不到位的站点，请重点关注`}
              description="综合得分低于70分、或高温枪位超过3个、或工单完成率低于75%的站点"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Row gutter={16}>
            {poorMaintenanceStations.map(station => (
              <Col span={8} key={station.stationId}>
                <Card
                  type="inner"
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge status="error" />
                      <span>{station.stationName}</span>
                    </div>
                  }
                  extra={<Tag color="red">需整改</Tag>}
                  style={{ marginBottom: 16 }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#666' }}><FireOutlined style={{ color: '#ff4d4f', marginRight: 4 }} /> 高温枪位</span>
                      <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{station.highTempCount}个</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#666' }}><FileTextOutlined style={{ color: '#faad14', marginRight: 4 }} /> 工单数量</span>
                      <span>{station.workOrderCount}个</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#666' }}><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} /> 完成率</span>
                      <span style={{ color: station.completionRate < 75 ? '#ff4d4f' : '#666' }}>
                        {station.completionRate}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#666' }}><ClockCircleOutlined style={{ color: '#722ed1', marginRight: 4 }} /> 响应时间</span>
                      <span>{station.avgResponseTime}分钟</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#666' }}><ToolOutlined style={{ color: '#1677ff', marginRight: 4 }} /> 负责人</span>
                      <span>{station.manager}</span>
                    </div>
                  </Space>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>综合评分</div>
                    <Progress
                      percent={station.score}
                      strokeColor="#ff4d4f"
                      status="exception"
                    />
                  </div>
                  <Button type="primary" danger size="small" block style={{ marginTop: 12 }}>
                    下发整改通知
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </Tabs.TabPane>
      </Tabs>

      <Modal
        title="保存视图方案"
        open={saveModalVisible}
        onCancel={() => setSaveModalVisible(false)}
        onOk={handleSavePreset}
        okText="保存"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="方案名称"
            rules={[{ required: true, message: '请输入方案名称' }]}
            initialValue={`${selectedArea === 'all' ? '全区域' : selectedArea}${
              { score: '综合得分', highTemp: '高温优先', workOrder: '工单优先', completion: '完成率', response: '响应' }[sortBy]
            }看板`}
          >
            <Input placeholder="例如：朝阳区高温优先看板" />
          </Form.Item>
          <Card size="small" style={{ background: '#fafafa' }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>当前配置：</div>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#999' }}>区域筛选：</span>
                <span>{selectedArea === 'all' ? '全区域' : selectedArea}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#999' }}>排序方式：</span>
                <span>{{ score: '综合得分', highTemp: '高温枪位优先', workOrder: '工单数量优先', completion: '完成率优先', response: '响应时间优先' }[sortBy]}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#999' }}>查看模式：</span>
                <span>{{ rank: '综合排名', compare: '多维度对比', maintenance: '维护不到位筛查' }[viewMode]}</span>
              </div>
            </Space>
          </Card>
        </Form>
      </Modal>
    </div>
  )
}

function BarChartIcon() {
  return <span style={{ color: '#1677ff' }}>▦</span>
}

export default BenchmarkRanking
