import { useState, useMemo } from 'react'
import { Row, Col, Card, Select, DatePicker, Tabs, Tag, List, Progress, Tooltip } from 'antd'
import {
  LineChartOutlined,
  ThunderboltOutlined,
  CloudOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { mockStations, mockGuns, mockTempRecords, mockWeatherData } from '../mock'
import type { Station } from '../types'

const { RangePicker } = DatePicker

interface Props {
  selectedArea: string
}

function TrendAnalysis({ selectedArea }: Props) {
  const [selectedStationId, setSelectedStationId] = useState<string>('all')
  const [selectedGunModel, setSelectedGunModel] = useState<string>('all')

  const filteredStations = useMemo(() => {
    if (selectedArea === 'all') return mockStations
    return mockStations.filter(s => s.area === selectedArea)
  }, [selectedArea])

  const filteredGuns = useMemo(() => {
    let guns = mockGuns
    if (selectedStationId !== 'all') {
      guns = guns.filter(g => g.stationId === selectedStationId)
    } else if (selectedArea !== 'all') {
      const stationIds = filteredStations.map(s => s.id)
      guns = guns.filter(g => stationIds.includes(g.stationId))
    }
    if (selectedGunModel !== 'all') {
      guns = guns.filter(g => g.model === selectedGunModel)
    }
    return guns
  }, [selectedStationId, selectedGunModel, filteredStations, selectedArea])

  const gunModels = useMemo(() => {
    const models = [...new Set(mockGuns.map(g => g.model))]
    return models
  }, [])

  const dailyTrendOption = useMemo(() => {
    const days = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      days.push(dayjs(d).format('MM-DD'))
    }

    const avgTemps: number[] = []
    const maxTemps: number[] = []
    const minTemps: number[] = []

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dayStr = d.toISOString().split('T')[0]

      const dayRecords = mockTempRecords.filter(r => {
        if (selectedStationId !== 'all' && r.stationId !== selectedStationId) return false
        if (selectedArea !== 'all' && selectedStationId === 'all') {
          const station = filteredStations.find(s => s.id === r.stationId)
          if (!station) return false
        }
        return r.time.startsWith(dayStr)
      })

      if (dayRecords.length > 0) {
        const temps = dayRecords.map(r => r.temperature)
        avgTemps.push(Number((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)))
        maxTemps.push(Number(Math.max(...temps).toFixed(1)))
        minTemps.push(Number(Math.min(...temps).toFixed(1)))
      } else {
        avgTemps.push(0)
        maxTemps.push(0)
        minTemps.push(0)
      }
    }

    return {
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['平均温度', '最高温度', '最低温度'],
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
        boundaryGap: false,
        data: days,
      },
      yAxis: {
        type: 'value',
        name: '温度(℃)',
        axisLabel: {
          formatter: '{value}℃',
        },
      },
      series: [
        {
          name: '平均温度',
          type: 'line',
          smooth: true,
          data: avgTemps,
          itemStyle: { color: '#1677ff' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(22, 119, 255, 0.3)' },
                { offset: 1, color: 'rgba(22, 119, 255, 0.05)' },
              ],
            },
          },
        },
        {
          name: '最高温度',
          type: 'line',
          smooth: true,
          data: maxTemps,
          itemStyle: { color: '#ff4d4f' },
          lineStyle: { type: 'dashed' },
        },
        {
          name: '最低温度',
          type: 'line',
          smooth: true,
          data: minTemps,
          itemStyle: { color: '#52c41a' },
          lineStyle: { type: 'dashed' },
        },
        {
          name: '高温预警线',
          type: 'line',
          markLine: {
            silent: true,
            data: [{ yAxis: 60, label: { formatter: '60℃预警线' } }],
            lineStyle: { color: '#faad14', type: 'dotted' },
          },
        },
      ],
    }
  }, [selectedStationId, selectedArea, filteredStations])

  const modelCompareOption = useMemo(() => {
    const modelData: Record<string, { avg: number[]; count: number; max: number; stations: Set<string> }> = {}

    filteredGuns.forEach(gun => {
      if (!modelData[gun.model]) {
        modelData[gun.model] = { avg: [], count: 0, max: 0, stations: new Set() }
      }
      modelData[gun.model].avg.push(gun.currentTemp)
      modelData[gun.model].count++
      modelData[gun.model].max = Math.max(modelData[gun.model].max, gun.maxTemp)
      modelData[gun.model].stations.add(gun.stationId)
    })

    const models = Object.keys(modelData)
    const avgTemps = models.map(m => {
      const data = modelData[m]
      return Number((data.avg.reduce((a, b) => a + b, 0) / data.avg.length).toFixed(1))
    })
    const maxTemps = models.map(m => modelData[m].max)
    const counts = models.map(m => modelData[m].count)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['平均温度', '最高温度', '枪位数量'],
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
        data: models.map(m => m.split('-')[0]),
        axisLabel: {
          rotate: 20,
          fontSize: 11,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '温度(℃)',
          position: 'left',
        },
        {
          type: 'value',
          name: '枪位数',
          position: 'right',
        },
      ],
      series: [
        {
          name: '平均温度',
          type: 'bar',
          data: avgTemps,
          itemStyle: { color: '#1677ff' },
          barWidth: '25%',
          yAxisIndex: 0,
        },
        {
          name: '最高温度',
          type: 'bar',
          data: maxTemps,
          itemStyle: { color: '#ff4d4f' },
          barWidth: '25%',
          yAxisIndex: 0,
        },
        {
          name: '枪位数量',
          type: 'line',
          data: counts,
          smooth: true,
          itemStyle: { color: '#faad14' },
          yAxisIndex: 1,
        },
      ],
    }
  }, [filteredGuns])

  const hourlyTrendOption = useMemo(() => {
    const hours = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
    const tempByHour: number[][] = hours.map(() => [])

    mockTempRecords.forEach(record => {
      if (selectedStationId !== 'all' && record.stationId !== selectedStationId) return
      if (selectedArea !== 'all' && selectedStationId === 'all') {
        const station = filteredStations.find(s => s.id === record.stationId)
        if (!station) return
      }
      const hour = new Date(record.time).getHours()
      const hourIndex = Math.floor((hour - 6) / 2)
      if (hourIndex >= 0 && hourIndex < hours.length) {
        tempByHour[hourIndex].push(record.temperature)
      }
    })

    const avgTemps = tempByHour.map(temps =>
      temps.length > 0 ? Number((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)) : 0
    )

    const powerByHour: number[][] = hours.map(() => [])
    mockTempRecords.forEach(record => {
      if (selectedStationId !== 'all' && record.stationId !== selectedStationId) return
      if (selectedArea !== 'all' && selectedStationId === 'all') {
        const station = filteredStations.find(s => s.id === record.stationId)
        if (!station) return
      }
      const hour = new Date(record.time).getHours()
      const hourIndex = Math.floor((hour - 6) / 2)
      if (hourIndex >= 0 && hourIndex < hours.length) {
        powerByHour[hourIndex].push(record.power)
      }
    })

    const avgPower = powerByHour.map(powers =>
      powers.length > 0 ? Math.round(powers.reduce((a, b) => a + b, 0) / powers.length) : 0
    )

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['平均温度', '平均充电功率'],
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
        data: hours,
      },
      yAxis: [
        {
          type: 'value',
          name: '温度(℃)',
          position: 'left',
        },
        {
          type: 'value',
          name: '功率(kW)',
          position: 'right',
        },
      ],
      series: [
        {
          name: '平均温度',
          type: 'line',
          smooth: true,
          data: avgTemps,
          itemStyle: { color: '#ff4d4f' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255, 77, 79, 0.2)' },
                { offset: 1, color: 'rgba(255, 77, 79, 0)' },
              ],
            },
          },
          yAxisIndex: 0,
        },
        {
          name: '平均充电功率',
          type: 'line',
          smooth: true,
          data: avgPower,
          itemStyle: { color: '#1677ff' },
          yAxisIndex: 1,
        },
      ],
    }
  }, [selectedStationId, selectedArea, filteredStations])

  const weatherCompareOption = useMemo(() => {
    const weatherMap = new Map<string, { temps: number[]; count: number }>()

    mockWeatherData.forEach(weather => {
      const key = weather.weather
      if (!weatherMap.has(key)) {
        weatherMap.set(key, { temps: [], count: 0 })
      }
      const dayRecords = mockTempRecords.filter(r => r.time.startsWith(weather.date))
      dayRecords.forEach(record => {
        if (selectedStationId !== 'all' && record.stationId !== selectedStationId) return
        if (selectedArea !== 'all' && selectedStationId === 'all') {
          const station = filteredStations.find(s => s.id === record.stationId)
          if (!station) return
        }
        weatherMap.get(key)!.temps.push(record.temperature)
      })
      weatherMap.get(key)!.count++
    })

    const weatherTypes = Array.from(weatherMap.keys())
    const avgTemps = weatherTypes.map(w => {
      const data = weatherMap.get(w)!
      return data.temps.length > 0 ? Number((data.temps.reduce((a, b) => a + b, 0) / data.temps.length).toFixed(1)) : 0
    })
    const days = weatherTypes.map(w => weatherMap.get(w)!.count)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['平均枪温', '天数'],
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
        data: weatherTypes,
      },
      yAxis: [
        {
          type: 'value',
          name: '温度(℃)',
          position: 'left',
        },
        {
          type: 'value',
          name: '天数',
          position: 'right',
        },
      ],
      series: [
        {
          name: '平均枪温',
          type: 'bar',
          data: avgTemps,
          itemStyle: { color: '#ff7a45' },
          barWidth: '40%',
          yAxisIndex: 0,
        },
        {
          name: '天数',
          type: 'line',
          data: days,
          smooth: true,
          itemStyle: { color: '#13c2c2' },
          yAxisIndex: 1,
        },
      ],
    }
  }, [selectedStationId, selectedArea, filteredStations])

  const topHighTempGuns = useMemo(() => {
    return [...filteredGuns]
      .sort((a, b) => b.currentTemp - a.currentTemp)
      .slice(0, 10)
  }, [filteredGuns])

  const tempChange30d = useMemo(() => {
    const firstDayRecords = mockTempRecords.filter(r => {
      const d = new Date(now)
      d.setDate(d.getDate() - 29)
      return r.time.startsWith(d.toISOString().split('T')[0])
    })
    const lastDayRecords = mockTempRecords.filter(r => {
      const d = new Date(now)
      return r.time.startsWith(d.toISOString().split('T')[0])
    })

    const firstAvg = firstDayRecords.length > 0
      ? firstDayRecords.reduce((sum, r) => sum + r.temperature, 0) / firstDayRecords.length
      : 0
    const lastAvg = lastDayRecords.length > 0
      ? lastDayRecords.reduce((sum, r) => sum + r.temperature, 0) / lastDayRecords.length
      : 0

    return {
      change: Number((lastAvg - firstAvg).toFixed(1)),
      percent: firstAvg > 0 ? Number((((lastAvg - firstAvg) / firstAvg) * 100).toFixed(1)) : 0,
    }
  }, [])

  const now = new Date()

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#666' }}>选择站点：</span>
          <Select
            value={selectedStationId}
            onChange={setSelectedStationId}
            style={{ width: 200 }}
            options={[
              { value: 'all', label: '全部站点' },
              ...filteredStations.map(s => ({ value: s.id, label: s.name })),
            ]}
          />
          <span style={{ color: '#666', marginLeft: 16 }}>设备型号：</span>
          <Select
            value={selectedGunModel}
            onChange={setSelectedGunModel}
            style={{ width: 200 }}
            options={[
              { value: 'all', label: '全部型号' },
              ...gunModels.map(m => ({ value: m, label: m })),
            ]}
          />
          <RangePicker
            style={{ marginLeft: 16 }}
            defaultValue={[dayjs().subtract(30, 'day'), dayjs()]}
          />
        </div>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <StatisticCard
              title="30天温度变化"
              value={`${tempChange30d.change > 0 ? '+' : ''}${tempChange30d.change}℃`}
              desc={`较30天前 ${tempChange30d.percent > 0 ? '上升' : '下降'} ${Math.abs(tempChange30d.percent)}%`}
              icon={tempChange30d.change > 0 ? <RiseOutlined style={{ color: '#ff4d4f' }} /> : <FallOutlined style={{ color: '#52c41a' }} />}
              trend={tempChange30d.change > 0 ? 'up' : 'down'}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <StatisticCard
              title="当前平均温度"
              value={`${(filteredGuns.reduce((sum, g) => sum + g.currentTemp, 0) / filteredGuns.length).toFixed(1)}℃`}
              desc={`共${filteredGuns.length}个枪位`}
              icon={<ThermometerIcon />}
              trend="normal"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <StatisticCard
              title="高温枪位占比"
              value={`${((filteredGuns.filter(g => g.status === 'danger').length / filteredGuns.length) * 100).toFixed(1)}%`}
              desc={`${filteredGuns.filter(g => g.status === 'danger').length}个高温枪位`}
              icon={<ThunderboltOutlined style={{ color: '#ff4d4f' }} />}
              trend="up"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <StatisticCard
              title="涉及设备型号"
              value={`${new Set(filteredGuns.map(g => g.model)).size}种`}
              desc={`${filteredStations.length}个站点`}
              icon={<CloudOutlined style={{ color: '#1677ff' }} />}
              trend="normal"
            />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="1">
        <Tabs.TabPane tab="温升趋势" key="1">
          <Row gutter={16}>
            <Col span={16}>
              <Card
                title={
                  <div className="card-section-title">
                    <LineChartOutlined style={{ color: '#1677ff' }} />
                    30天温度变化趋势
                  </div>
                }
              >
                <ReactECharts option={dailyTrendOption} style={{ height: 350 }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card
                title={
                  <div className="card-section-title">
                    <ThunderboltOutlined style={{ color: '#ff4d4f' }} />
                    高温枪位TOP10
                  </div>
                }
              >
                <List
                  size="small"
                  dataSource={topHighTempGuns}
                  renderItem={(gun, index) => (
                    <List.Item>
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <span style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: index < 3 ? '#ff4d4f' : '#d9d9d9',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 'bold',
                          marginRight: 12,
                        }}>
                          {index + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>
                            {gun.stationName} - {gun.gunNo}
                          </div>
                          <div style={{ fontSize: 11, color: '#999' }}>{gun.model}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ff4d4f' }}>
                            {gun.currentTemp.toFixed(1)}℃
                          </div>
                          <Progress
                            percent={Math.round((gun.currentTemp / 90) * 100)}
                            size="small"
                            showInfo={false}
                            strokeColor="#ff4d4f"
                            style={{ width: 60 }}
                          />
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane tab="设备对比" key="2">
          <Row gutter={16}>
            <Col span={24}>
              <Card
                title={
                  <div className="card-section-title">
                    <ThunderboltOutlined style={{ color: '#1677ff' }} />
                    不同型号设备温升表现对比
                  </div>
                }
                extra={<Tag color="blue">按同型号设备跨站点对比</Tag>}
              >
                <ReactECharts option={modelCompareOption} style={{ height: 400 }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card
                title={
                  <div className="card-section-title">
                    <ClockCircleOutlined style={{ color: '#1677ff' }} />
                    各时段温升与充电功率关联
                  </div>
                }
                extra={<Tag color="orange">高峰时段分析</Tag>}
              >
                <ReactECharts option={hourlyTrendOption} style={{ height: 350 }} />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane tab="天气关联" key="3">
          <Row gutter={16}>
            <Col span={14}>
              <Card
                title={
                  <div className="card-section-title">
                    <CloudOutlined style={{ color: '#13c2c2' }} />
                    天气类型与枪温关系
                  </div>
                }
              >
                <ReactECharts option={weatherCompareOption} style={{ height: 350 }} />
              </Card>
            </Col>
            <Col span={10}>
              <Card
                title={
                  <div className="card-section-title">
                    <CloudOutlined style={{ color: '#faad14' }} />
                    30天天气概况
                  </div>
                }
              >
                <List
                  size="small"
                  dataSource={mockWeatherData.slice(-14).reverse()}
                  renderItem={weather => (
                    <List.Item>
                      <span style={{ width: 100 }}>{weather.date}</span>
                      <Tag color={
                        weather.weather === '晴' ? 'gold' :
                        weather.weather === '多云' ? 'blue' :
                        weather.weather === '阴' ? 'default' :
                        'cyan'
                      }>
                        {weather.weather}
                      </Tag>
                      <span style={{ marginLeft: 12 }}>{weather.temperature}℃</span>
                      <span style={{ color: '#999', marginLeft: 12 }}>湿度 {weather.humidity}%</span>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>
      </Tabs>
    </div>
  )
}

function StatisticCard({ title, value, desc, icon, trend }: {
  title: string
  value: string
  desc: string
  icon: React.ReactNode
  trend: 'up' | 'down' | 'normal'
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: '#f0f5ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 4 }}>{title}</div>
        <div style={{
          fontSize: 24, fontWeight: 'bold', color:
            trend === 'up' ? '#ff4d4f' : trend === 'down' ? '#52c41a' : '#262626'
        }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  )
}

function ThermometerIcon() {
  return <span style={{ color: '#faad14', fontSize: 24 }}>🌡️</span>
}

export default TrendAnalysis
