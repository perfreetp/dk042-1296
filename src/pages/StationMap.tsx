import { useState, useMemo } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Tooltip, Modal, List, Progress } from 'antd'
import {
  EnvironmentOutlined,
  WarningOutlined,
  FireOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { mockStations, mockGuns } from '../mock'
import type { Station, Gun } from '../types'

interface Props {
  selectedArea: string
}

function StationMap({ selectedArea }: Props) {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  const filteredStations = useMemo(() => {
    if (selectedArea === 'all') return mockStations
    return mockStations.filter(s => s.area === selectedArea)
  }, [selectedArea])

  const stats = useMemo(() => {
    const totalGuns = filteredStations.reduce((sum, s) => sum + s.totalGuns, 0)
    const highTempGuns = filteredStations.reduce((sum, s) => sum + s.highTempGuns, 0)
    const warningGuns = filteredStations.reduce((sum, s) => sum + s.warningGuns, 0)
    const normalGuns = filteredStations.reduce((sum, s) => sum + s.normalGuns, 0)
    const dangerStations = filteredStations.filter(s => s.status === 'danger').length
    const warningStations = filteredStations.filter(s => s.status === 'warning').length

    return { totalGuns, highTempGuns, warningGuns, normalGuns, dangerStations, warningStations }
  }, [filteredStations])

  const mapOption = useMemo(() => {
    const minLng = Math.min(...filteredStations.map(s => s.lng)) - 0.02
    const maxLng = Math.max(...filteredStations.map(s => s.lng)) + 0.02
    const minLat = Math.min(...filteredStations.map(s => s.lat)) - 0.02
    const maxLat = Math.max(...filteredStations.map(s => s.lat)) + 0.02

    const scatterData = filteredStations.map(station => {
      let color = '#52c41a'
      let size = 20
      if (station.status === 'danger') {
        color = '#ff4d4f'
        size = 30
      } else if (station.status === 'warning') {
        color = '#faad14'
        size = 25
      }
      return {
        name: station.name,
        value: [station.lng, station.lat, station.highTempGuns],
        itemStyle: { color },
        symbolSize: size,
        station,
      }
    })

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const s = params.data.station
          return `
            <div style="font-weight:bold;margin-bottom:8px;">${s.name}</div>
            <div>地址：${s.address}</div>
            <div>总枪位数：${s.totalGuns}</div>
            <div style="color:#ff4d4f">高温枪位：${s.highTempGuns}</div>
            <div style="color:#faad14">预警枪位：${s.warningGuns}</div>
            <div>负责人：${s.manager}</div>
          `
        },
      },
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: {
        type: 'value',
        min: minLng,
        max: maxLng,
        show: false,
      },
      yAxis: {
        type: 'value',
        min: minLat,
        max: maxLat,
        show: false,
      },
      series: [
        {
          name: '充电站',
          type: 'scatter',
          data: scatterData,
          emphasis: {
            scale: 1.3,
          },
        },
        {
          name: '标签',
          type: 'scatter',
          data: filteredStations.map(s => ({
            name: s.name,
            value: [s.lng, s.lat - 0.008],
          })),
          symbolSize: 0,
          label: {
            show: true,
            position: 'top',
            formatter: '{b}',
            fontSize: 11,
            color: '#666',
          },
        },
      ],
    }
  }, [filteredStations])

  const areaDistribution = useMemo(() => {
    const areaMap = new Map<string, { total: number; high: number; warning: number }>()
    filteredStations.forEach(station => {
      const area = station.area
      if (!areaMap.has(area)) {
        areaMap.set(area, { total: 0, high: 0, warning: 0 })
      }
      const data = areaMap.get(area)!
      data.total += station.totalGuns
      data.high += station.highTempGuns
      data.warning += station.warningGuns
    })
    return Array.from(areaMap.entries()).map(([name, data]) => ({
      name,
      ...data,
    }))
  }, [filteredStations])

  const barChartOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['正常', '预警', '高温'],
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
      data: areaDistribution.map(d => d.name),
    },
    yAxis: {
      type: 'value',
      name: '枪位数',
    },
    series: [
      {
        name: '正常',
        type: 'bar',
        stack: 'total',
        data: areaDistribution.map(d => d.total - d.high - d.warning),
        itemStyle: { color: '#52c41a' },
      },
      {
        name: '预警',
        type: 'bar',
        stack: 'total',
        data: areaDistribution.map(d => d.warning),
        itemStyle: { color: '#faad14' },
      },
      {
        name: '高温',
        type: 'bar',
        stack: 'total',
        data: areaDistribution.map(d => d.high),
        itemStyle: { color: '#ff4d4f' },
      },
    ],
  }), [areaDistribution])

  const stationColumns = [
    {
      title: '站点名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Station) => (
        <a onClick={() => { setSelectedStation(record); setModalVisible(true) }}>{text}</a>
      ),
    },
    { title: '区域', dataIndex: 'area', key: 'area' },
    {
      title: '总枪位',
      dataIndex: 'totalGuns',
      key: 'totalGuns',
      sorter: (a: Station, b: Station) => a.totalGuns - b.totalGuns,
    },
    {
      title: '高温枪位',
      dataIndex: 'highTempGuns',
      key: 'highTempGuns',
      sorter: (a: Station, b: Station) => a.highTempGuns - b.highTempGuns,
      render: (val: number) => <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{val}</span>,
    },
    {
      title: '预警枪位',
      dataIndex: 'warningGuns',
      key: 'warningGuns',
      render: (val: number) => <span style={{ color: '#faad14' }}>{val}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: Station['status']) => {
        const colorMap = { normal: 'green', warning: 'orange', danger: 'red' }
        const textMap = { normal: '正常', warning: '预警', danger: '高危' }
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>
      },
    },
    { title: '负责人', dataIndex: 'manager', key: 'manager' },
  ]

  const stationGuns = useMemo(() => {
    if (!selectedStation) return []
    return mockGuns.filter(g => g.stationId === selectedStation.id)
  }, [selectedStation])

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="站点总数"
              value={filteredStations.length}
              prefix={<EnvironmentOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="枪位总数"
              value={stats.totalGuns}
              prefix={<CheckCircleOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="预警站点"
              value={stats.warningStations}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              suffix="个"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="高危站点"
              value={stats.dangerStations}
              prefix={<FireOutlined style={{ color: '#ff4d4f' }} />}
              suffix="个"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card
            title={
              <div className="card-section-title">
                <EnvironmentOutlined style={{ color: '#1677ff' }} />
                区域站点分布地图
              </div>
            }
            extra={
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#52c41a', display: 'inline-block' }}></span>
                  正常
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#faad14', display: 'inline-block' }}></span>
                  预警
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff4d4f', display: 'inline-block' }}></span>
                  高危
                </span>
              </div>
            }
            style={{ height: 500 }}
          >
            <ReactECharts option={mapOption} style={{ height: 420 }} />
          </Card>
        </Col>

        <Col span={8}>
          <Card
            title={
              <div className="card-section-title">
                <BarChartIcon />
                各区域高温枪位分布
              </div>
            }
            style={{ height: 500, marginBottom: 16 }}
          >
            <ReactECharts option={barChartOption} style={{ height: 400 }} />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <div className="card-section-title">
            <InfoCircleOutlined style={{ color: '#1677ff' }} />
            站点明细列表
          </div>
        }
        style={{ marginTop: 16 }}
      >
        <Table
          columns={stationColumns}
          dataSource={filteredStations}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      </Card>

      <Modal
        title={`${selectedStation?.name} - 枪位详情`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={900}
      >
        {selectedStation && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '12px', background: '#f5f5f5', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#999' }}>总枪位数</div>
                  <div style={{ fontSize: 24, fontWeight: 'bold' }}>{selectedStation.totalGuns}</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '12px', background: '#fff1f0', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#ff4d4f' }}>高温枪位</div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>{selectedStation.highTempGuns}</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '12px', background: '#fffbe6', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#faad14' }}>预警枪位</div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>{selectedStation.warningGuns}</div>
                </div>
              </Col>
            </Row>

            <List
              grid={{ gutter: 12, column: 3 }}
              dataSource={stationGuns}
              renderItem={(gun: Gun) => (
                <List.Item>
                  <Card
                    size="small"
                    title={`${gun.gunNo} - ${gun.model.split('-')[0]}`}
                    extra={
                      <Tag color={gun.status === 'danger' ? 'red' : gun.status === 'warning' ? 'orange' : 'green'}>
                        {gun.status === 'danger' ? '高温' : gun.status === 'warning' ? '预警' : '正常'}
                      </Tag>
                    }
                    style={{
                      borderLeft: `4px solid ${gun.status === 'danger' ? '#ff4d4f' : gun.status === 'warning' ? '#faad14' : '#52c41a'}`,
                    }}
                  >
                    <div style={{ fontSize: 13 }}>
                      <div>功率：{gun.power}kW</div>
                      <div>当前温度：
                        <span className={`temperature-${gun.status === 'danger' ? 'danger' : gun.status === 'warning' ? 'warning' : 'normal'}`}
                          style={{ fontWeight: 'bold', fontSize: 16 }}>
                          {gun.currentTemp.toFixed(1)}℃
                        </span>
                      </div>
                      <div>最高温度：{gun.maxTemp.toFixed(1)}℃</div>
                      <Progress
                        percent={Math.round((gun.currentTemp / 90) * 100)}
                        size="small"
                        strokeColor={gun.status === 'danger' ? '#ff4d4f' : gun.status === 'warning' ? '#faad14' : '#52c41a'}
                        style={{ marginTop: 8 }}
                      />
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

function BarChartIcon() {
  return <span style={{ color: '#1677ff' }}>▦</span>
}

export default StationMap
