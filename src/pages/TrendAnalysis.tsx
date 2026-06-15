import { useState, useMemo, useEffect } from 'react'
import { Row, Col, Card, Select, DatePicker, Tabs, Tag, List, Progress, Modal, Descriptions, Button, Alert } from 'antd'
import {
  LineChartOutlined,
  ThunderboltOutlined,
  CloudOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  FallOutlined,
  WarningOutlined,
  ToolOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { mockStations, mockGuns, mockTempRecords, mockWeatherData } from '../mock'
import type { Gun } from '../types'

const { RangePicker } = DatePicker

interface TrendDrillParams {
  area?: string
  stationId?: string
  activeTab?: string
}

interface Props {
  selectedArea: string
  onAreaChange?: (area: string) => void
  drillParams?: TrendDrillParams | null
  onClearDrill?: () => void
}

interface AbnormalGun {
  gun: Gun
  tempRiseRate: number
  consecutiveWarningDays: number
  maxTemp: number
  avgTemp: number
  suggestion: string
}

function TrendAnalysis({ selectedArea, onAreaChange, drillParams, onClearDrill }: Props) {
  const [selectedStationId, setSelectedStationId] = useState<string>('all')
  const [selectedGunModel, setSelectedGunModel] = useState<string>('all')
  const [abnormalDetailVisible, setAbnormalDetailVisible] = useState(false)
  const [selectedAbnormalGun, setSelectedAbnormalGun] = useState<AbnormalGun | null>(null)
  const [activeTab, setActiveTab] = useState<string>('1')
  const [drillApplied, setDrillApplied] = useState<TrendDrillParams | null>(null)

  useEffect(() => {
    if (selectedArea === 'all') return
    const station = mockStations.find(s => s.id === selectedStationId)
    if (!station || station.area !== selectedArea) {
      setSelectedStationId('all')
    }
  }, [selectedArea, selectedStationId])

  useEffect(() => {
    if (!drillParams) return
    if (drillParams.area && drillParams.area !== selectedArea) {
      if (onAreaChange) onAreaChange(drillParams.area)
    }
    if (drillParams.stationId) {
      setSelectedStationId(drillParams.stationId)
    }
    if (drillParams.activeTab) {
      const tabKey = drillParams.activeTab === 'abnormal' ? '4' : drillParams.activeTab === 'trend' ? '1' : drillParams.activeTab
      setActiveTab(tabKey)
    }
    setDrillApplied(drillParams)
  }, [drillParams])

  const filteredStations = useMemo(() => {
    if (selectedArea === 'all') return mockStations
    return mockStations.filter(s => s.area === selectedArea)
  }, [selectedArea])

  const filteredStationIds = useMemo(() => {
    return new Set(filteredStations.map(s => s.id))
  }, [filteredStations])

  const filteredGuns = useMemo(() => {
    let guns = mockGuns
    if (selectedStationId !== 'all') {
      guns = guns.filter(g => g.stationId === selectedStationId)
    } else if (selectedArea !== 'all') {
      guns = guns.filter(g => filteredStationIds.has(g.stationId))
    }
    if (selectedGunModel !== 'all') {
      guns = guns.filter(g => g.model === selectedGunModel)
    }
    return guns
  }, [selectedStationId, selectedGunModel, filteredStationIds, selectedArea])

  const gunModels = useMemo(() => {
    return [...new Set(mockGuns.map(g => g.model))]
  }, [])

  const now = useMemo(() => new Date(), [])

  const filteredGunIds = useMemo(() => {
    return new Set(filteredGuns.map(g => g.id))
  }, [filteredGuns])

  const filteredRecords = useMemo(() => {
    return mockTempRecords.filter(r => {
      if (selectedStationId !== 'all' && r.stationId !== selectedStationId) return false
      if (selectedArea !== 'all' && selectedStationId === 'all' && !filteredStationIds.has(r.stationId)) return false
      if (selectedGunModel !== 'all' && !filteredGunIds.has(r.gunId)) return false
      return true
    })
  }, [selectedStationId, selectedArea, filteredStationIds, selectedGunModel, filteredGunIds])

  const abnormalGuns = useMemo<AbnormalGun[]>(() => {
    const gunMap = new Map<string, { gun: Gun; records: typeof mockTempRecords }>()

    filteredGuns.forEach(gun => {
      gunMap.set(gun.id, { gun, records: [] })
    })

    filteredRecords.forEach(record => {
      const entry = gunMap.get(record.gunId)
      if (entry) {
        entry.records.push(record)
      }
    })

    const results: AbnormalGun[] = []

    gunMap.forEach(({ gun, records }) => {
      if (records.length < 5) return

      const sortedRecords = [...records].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

      const daysMap = new Map<string, number[]>()
      records.forEach(r => {
        const day = r.time.split('T')[0]
        if (!daysMap.has(day)) {
          daysMap.set(day, [])
        }
        daysMap.get(day)!.push(r.temperature)
      })

      const days = Array.from(daysMap.keys()).sort()
      const dayAvgs = days.map(day => {
        const temps = daysMap.get(day)!
        return {
          day,
          avg: temps.reduce((a, b) => a + b, 0) / temps.length,
          max: Math.max(...temps),
        }
      })

      let consecutiveWarningDays = 0
      let currentStreak = 0
      dayAvgs.forEach(d => {
        if (d.max > 60) {
          currentStreak++
          consecutiveWarningDays = Math.max(consecutiveWarningDays, currentStreak)
        } else {
          currentStreak = 0
        }
      })

      const first7Avg = dayAvgs.slice(0, 7).reduce((sum, d) => sum + d.avg, 0) / Math.min(7, dayAvgs.length)
      const last7Avg = dayAvgs.slice(-7).reduce((sum, d) => sum + d.avg, 0) / Math.min(7, dayAvgs.length)
      const tempRiseRate = Number((last7Avg - first7Avg).toFixed(1))

      const allTemps = records.map(r => r.temperature)
      const maxTemp = Math.max(...allTemps)
      const avgTemp = allTemps.reduce((a, b) => a + b, 0) / allTemps.length

      if (tempRiseRate > 3 || consecutiveWarningDays >= 2 || maxTemp > 70) {
        let suggestion = ''
        if (maxTemp > 75) {
          suggestion = '紧急：建议立即停机检查，更换散热模块和枪线连接器'
        } else if (consecutiveWarningDays >= 3) {
          suggestion = '高频：建议3天内安排现场巡检，清洁散热系统，检查风扇运转'
        } else if (tempRiseRate > 5) {
          suggestion = '升温快：建议检查负载情况，优化散热条件，增加散热风扇'
        } else if (avgTemp > 55) {
          suggestion = '偏高：建议列入下周巡检计划，重点关注温升趋势'
        } else {
          suggestion = '关注：建议增加远程监控频次，持续观察温度变化'
        }

        results.push({
          gun,
          tempRiseRate: Number(tempRiseRate),
          consecutiveWarningDays,
          maxTemp,
          avgTemp: Number(avgTemp.toFixed(1)),
          suggestion,
        })
      }
    })

    return results.sort((a, b) => b.tempRiseRate - a.tempRiseRate)
  }, [filteredGuns, filteredRecords])

  const dailyTrendOption = useMemo(() => {
    const days: string[] = []
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

      const dayRecords = filteredRecords.filter(r => r.time.startsWith(dayStr))

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
      tooltip: { trigger: 'axis' },
      legend: { data: ['平均温度', '最高温度', '最低温度'], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: days },
      yAxis: { type: 'value', name: '温度(℃)', axisLabel: { formatter: '{value}℃' } },
      series: [
        {
          name: '平均温度', type: 'line', smooth: true, data: avgTemps,
          itemStyle: { color: '#1677ff' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(22, 119, 255, 0.3)' },
                { offset: 1, color: 'rgba(22, 119, 255, 0.05)' },
              ],
            },
          },
        },
        {
          name: '最高温度', type: 'line', smooth: true, data: maxTemps,
          itemStyle: { color: '#ff4d4f' }, lineStyle: { type: 'dashed' },
        },
        {
          name: '最低温度', type: 'line', smooth: true, data: minTemps,
          itemStyle: { color: '#52c41a' }, lineStyle: { type: 'dashed' },
        },
        {
          name: '高温预警线', type: 'line',
          markLine: {
            silent: true,
            data: [{ yAxis: 60, label: { formatter: '60℃预警线' } }],
            lineStyle: { color: '#faad14', type: 'dotted' },
          },
        },
      ],
    }
  }, [now, filteredRecords])

  const modelCompareOption = useMemo(() => {
    const modelData: Record<string, { avg: number[]; count: number; max: number }> = {}

    filteredGuns.forEach(gun => {
      if (!modelData[gun.model]) {
        modelData[gun.model] = { avg: [], count: 0, max: 0 }
      }
      modelData[gun.model].avg.push(gun.currentTemp)
      modelData[gun.model].count++
      modelData[gun.model].max = Math.max(modelData[gun.model].max, gun.maxTemp)
    })

    const models = Object.keys(modelData)
    const avgTemps = models.map(m => {
      const data = modelData[m]
      return Number((data.avg.reduce((a, b) => a + b, 0) / data.avg.length).toFixed(1))
    })
    const maxTemps = models.map(m => modelData[m].max)
    const counts = models.map(m => modelData[m].count)

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['平均温度', '最高温度', '枪位数量'], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: models.map(m => m.split('-')[0]),
        axisLabel: { rotate: 20, fontSize: 11 },
      },
      yAxis: [
        { type: 'value', name: '温度(℃)', position: 'left' },
        { type: 'value', name: '枪位数', position: 'right' },
      ],
      series: [
        { name: '平均温度', type: 'bar', data: avgTemps, itemStyle: { color: '#1677ff' }, barWidth: '25%', yAxisIndex: 0 },
        { name: '最高温度', type: 'bar', data: maxTemps, itemStyle: { color: '#ff4d4f' }, barWidth: '25%', yAxisIndex: 0 },
        { name: '枪位数量', type: 'line', data: counts, smooth: true, itemStyle: { color: '#faad14' }, yAxisIndex: 1 },
      ],
    }
  }, [filteredGuns])

  const hourlyTrendOption = useMemo(() => {
    const hours = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
    const tempByHour: number[][] = hours.map(() => [])
    const powerByHour: number[][] = hours.map(() => [])

    filteredRecords.forEach(record => {
      const hour = new Date(record.time).getHours()
      const hourIndex = Math.floor((hour - 6) / 2)
      if (hourIndex >= 0 && hourIndex < hours.length) {
        tempByHour[hourIndex].push(record.temperature)
        powerByHour[hourIndex].push(record.power)
      }
    })

    const avgTemps = tempByHour.map(temps =>
      temps.length > 0 ? Number((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)) : 0
    )
    const avgPower = powerByHour.map(powers =>
      powers.length > 0 ? Math.round(powers.reduce((a, b) => a + b, 0) / powers.length) : 0
    )

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: ['平均温度', '平均充电功率'], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: { type: 'category', data: hours },
      yAxis: [
        { type: 'value', name: '温度(℃)', position: 'left' },
        { type: 'value', name: '功率(kW)', position: 'right' },
      ],
      series: [
        {
          name: '平均温度', type: 'line', smooth: true, data: avgTemps,
          itemStyle: { color: '#ff4d4f' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255, 77, 79, 0.2)' },
                { offset: 1, color: 'rgba(255, 77, 79, 0)' },
              ],
            },
          },
          yAxisIndex: 0,
        },
        {
          name: '平均充电功率', type: 'line', smooth: true, data: avgPower,
          itemStyle: { color: '#1677ff' }, yAxisIndex: 1,
        },
      ],
    }
  }, [filteredRecords])

  const weatherCompareOption = useMemo(() => {
    const weatherMap = new Map<string, { temps: number[]; count: number }>()

    mockWeatherData.forEach(weather => {
      const key = weather.weather
      if (!weatherMap.has(key)) {
        weatherMap.set(key, { temps: [], count: 0 })
      }
      const dayRecords = filteredRecords.filter(r => r.time.startsWith(weather.date))
      dayRecords.forEach(record => {
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
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['平均枪温', '天数'], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: { type: 'category', data: weatherTypes },
      yAxis: [
        { type: 'value', name: '温度(℃)', position: 'left' },
        { type: 'value', name: '天数', position: 'right' },
      ],
      series: [
        { name: '平均枪温', type: 'bar', data: avgTemps, itemStyle: { color: '#ff7a45' }, barWidth: '40%', yAxisIndex: 0 },
        { name: '天数', type: 'line', data: days, smooth: true, itemStyle: { color: '#13c2c2' }, yAxisIndex: 1 },
      ],
    }
  }, [filteredRecords])

  const topHighTempGuns = useMemo(() => {
    return [...filteredGuns]
      .sort((a, b) => b.currentTemp - a.currentTemp)
      .slice(0, 10)
  }, [filteredGuns])

  const tempChange30d = useMemo(() => {
    const firstDayDate = new Date(now)
    firstDayDate.setDate(firstDayDate.getDate() - 29)
    const firstDayStr = firstDayDate.toISOString().split('T')[0]

    const lastDayDate = new Date(now)
    const lastDayStr = lastDayDate.toISOString().split('T')[0]

    const firstDayRecords = filteredRecords.filter(r => r.time.startsWith(firstDayStr))
    const lastDayRecords = filteredRecords.filter(r => r.time.startsWith(lastDayStr))

    const firstAvg = firstDayRecords.length > 0
      ? firstDayRecords.reduce((sum, r) => sum + r.temperature, 0) / firstDayRecords.length
      : 0
    const lastAvg = lastDayRecords.length > 0
      ? lastDayRecords.reduce((sum, r) => sum + r.temperature, 0) / lastDayRecords.length
      : 0

    const change = Number((lastAvg - firstAvg).toFixed(1))
    const percent = firstAvg > 0 ? Number((((lastAvg - firstAvg) / firstAvg) * 100).toFixed(1)) : 0

    return { change, percent }
  }, [now, filteredRecords])

  const currentAvgTemp = useMemo(() => {
    if (filteredGuns.length === 0) return '0.0'
    return (filteredGuns.reduce((sum, g) => sum + g.currentTemp, 0) / filteredGuns.length).toFixed(1)
  }, [filteredGuns])

  const highTempRatio = useMemo(() => {
    if (filteredGuns.length === 0) return '0.0'
    return ((filteredGuns.filter(g => g.status === 'danger').length / filteredGuns.length) * 100).toFixed(1)
  }, [filteredGuns])

  const highTempCount = useMemo(() => {
    return filteredGuns.filter(g => g.status === 'danger').length
  }, [filteredGuns])

  const modelCount = useMemo(() => {
    return new Set(filteredGuns.map(g => g.model)).size
  }, [filteredGuns])

  const getGunTrendOption = (gunId: string) => {
    const gunRecords = filteredRecords.filter(r => r.gunId === gunId)

    const daysMap = new Map<string, { avg: number; max: number; count: number }>()

    gunRecords.forEach(r => {
      const day = r.time.split('T')[0]
      if (!daysMap.has(day)) {
        daysMap.set(day, { avg: r.temperature, max: r.temperature, count: 1 })
      } else {
        const existing = daysMap.get(day)!
        existing.avg += r.temperature
        existing.max = Math.max(existing.max, r.temperature)
        existing.count += 1
      }
    })

    const days: string[] = []
    const avgTemps: number[] = []
    const maxTemps: number[] = []

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dayStr = d.toISOString().split('T')[0]
      const data = daysMap.get(dayStr)
      days.push(dayjs(d).format('MM-DD'))
      if (data && data.count) {
        avgTemps.push(Number((data.avg / data.count).toFixed(1)))
        maxTemps.push(Number(data.max.toFixed(1)))
      } else {
        avgTemps.push(0)
        maxTemps.push(0)
      }
    }

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['日均温', '日最高温'], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: days },
      yAxis: { type: 'value', name: '温度(℃)' },
      series: [
        {
          name: '日均温', type: 'line', smooth: true, data: avgTemps,
          itemStyle: { color: '#1677ff' }, areaStyle: { color: 'rgba(22, 119, 255, 0.15)' },
        },
        {
          name: '日最高温', type: 'line', smooth: true, data: maxTemps,
          itemStyle: { color: '#ff4d4f' },
        },
      ],
    }
  }

  const drillSourceText = useMemo(() => {
    if (!drillApplied) return null
    const station = drillApplied.stationId
      ? mockStations.find(s => s.id === drillApplied.stationId)?.name
      : null
    const area = drillApplied.area
    const parts: string[] = []
    if (area && area !== 'all') parts.push(area)
    if (station) parts.push(station)
    const tab = drillApplied.activeTab === 'abnormal' ? '异常升温视图' : drillApplied.activeTab === 'trend' ? '温升趋势视图' : ''
    return `${parts.join(' - ')}${tab ? '，' + tab : ''}`
  }, [drillApplied])

  return (
    <div>
      {drillApplied && drillSourceText && (
        <Alert
          type="info"
          showIcon
          closable
          onClose={() => {
            setDrillApplied(null)
            if (onClearDrill) onClearDrill()
          }}
          style={{ marginBottom: 16 }}
          message={
            <span>
              已从站点地图钻取：<strong style={{ color: '#1677ff' }}>{drillSourceText}</strong>
              <Button
                type="link"
                size="small"
                icon={<CloseOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  setDrillApplied(null)
                  if (onClearDrill) onClearDrill()
                  setSelectedStationId('all')
                  setSelectedGunModel('all')
                  if (onAreaChange) onAreaChange('all')
                }}
                style={{ marginLeft: 12 }}
              >
                清除钻取条件
              </Button>
            </span>
          }
        />
      )}
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
        <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
          当前筛选口径：区域（{selectedArea === 'all' ? '全区域' : selectedArea}） · 站点（{selectedStationId === 'all' ? '全部' : mockStations.find(s => s.id === selectedStationId)?.name || '全部'}） · 型号（{selectedGunModel === 'all' ? '全部' : selectedGunModel}） · 枪位（{filteredGuns.length}个） · 记录（{filteredRecords.length}条）
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
              value={`${currentAvgTemp}℃`}
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
              value={`${highTempRatio}%`}
              desc={`${highTempCount}个高温枪位`}
              icon={<ThunderboltOutlined style={{ color: '#ff4d4f' }} />}
              trend="up"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <StatisticCard
              title="涉及设备型号"
              value={`${modelCount}种`}
              desc={`${filteredStations.length}个站点`}
              icon={<CloudOutlined style={{ color: '#1677ff' }} />}
              trend="normal"
            />
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
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
                        width: 24, height: 24, borderRadius: '50%',
                        background: index < 3 ? '#ff4d4f' : '#d9d9d9',
                        color: '#fff', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 12, fontWeight: 'bold',
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

        <Tabs.TabPane tab={<span><AlertOutlined style={{ marginRight: 6 }} />异常升温识别</span>} key="4">
          <Row gutter={16}>
            <Col span={24}>
              <Card
              title={
                <div className="card-section-title">
                  <WarningOutlined style={{ color: '#ff4d4f' }} />
                  异常升温枪位列表
                </div>
              }
              extra={<Tag color="red">共识别出 {abnormalGuns.length} 个需关注</Tag>}
            >
              {abnormalGuns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#52c41a' }}>
                <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div style={{ fontSize: 16 }}>当前筛选范围内无异常升温枪位</div>
              </div>
            ) : (
              <List
                dataSource={abnormalGuns}
                renderItem={(item, index) => (
                  <List.Item
                    actions={[
                      <Button type="link" onClick={() => {
                      setSelectedAbnormalGun(item);
                      setAbnormalDetailVisible(true);
                    }}>查看详情</Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{
                          width: 44, height: 44, borderRadius: 8,
                          background: item.maxTemp > 75 ? '#ff4d4f' : '#faad14',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 20,
                        }}>
                          {index + 1}
                        </div>
                      }
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 500 }}>{item.gun.stationName} - {item.gun.gunNo}</span>
                          <Tag color="blue">{item.gun.model.split('-')[0]}</Tag>
                          {item.consecutiveWarningDays >= 3 && <Tag color="red">连续{''}
{item.consecutiveWarningDays}天超预警</Tag>}
                          {item.tempRiseRate > 5 && <Tag color="orange">升温快</Tag>}
                        </div>
                      }
                      description={
                        <div style={{ display: 'flex', gap: 24, marginTop: 6, color: '#666', fontSize: 13 }}>
                          <span>最高温度：<strong style={{ color: '#ff4d4f' }}>{item.maxTemp.toFixed(1)}℃</strong></span>
                          <span>30天升温：<strong style={{ color: item.tempRiseRate > 0 ? '#ff4d4f' : '#52c41a' }}>
                            {item.tempRiseRate > 0 ? '+' : ''}{item.tempRiseRate}℃
                          </strong></span>
                          <span>连续超预警：<strong>{item.consecutiveWarningDays}天</strong></span>
                          <span>平均温度：{item.avgTemp}℃</span>
                        </div>
                      }
                    />
                    <div style={{ maxWidth: 420, padding: 8, background: item.maxTemp > 75 ? '#fff1f0' : '#fffbe6', borderRadius: 6 }}>
                      <ToolOutlined style={{ marginRight: 6 }} />
                      <span style={{ fontSize: 12, color: item.maxTemp > 75 ? '#ff4d4f' : '#faad14' }}>
                        {item.suggestion}
                      </span>
                    </div>
                  </List.Item>
                )}
                pagination={{ pageSize: 6 }}
              />
            )}
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

      <Modal
        title="异常枪位详情"
        open={abnormalDetailVisible}
        onCancel={() => setAbnormalDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setAbnormalDetailVisible(false)}>关闭</Button>,
        ]}
        width={800}
      >
        {selectedAbnormalGun && (
          <div>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="站点名称">{selectedAbnormalGun.gun.stationName}</Descriptions.Item>
              <Descriptions.Item label="枪位编号">{selectedAbnormalGun.gun.gunNo}</Descriptions.Item>
              <Descriptions.Item label="设备型号">{selectedAbnormalGun.gun.model}</Descriptions.Item>
              <Descriptions.Item label="功率">{selectedAbnormalGun.gun.power}kW</Descriptions.Item>
              <Descriptions.Item label="最高温度">
                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{selectedAbnormalGun.maxTemp.toFixed(1)}℃</span>
              </Descriptions.Item>
              <Descriptions.Item label="平均温度">{selectedAbnormalGun.avgTemp}℃</Descriptions.Item>
              <Descriptions.Item label="30天升温">
                <span style={{ color: selectedAbnormalGun.tempRiseRate > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }}>
                  {selectedAbnormalGun.tempRiseRate > 0 ? '+' : ''}{selectedAbnormalGun.tempRiseRate}℃
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="连续超预警">{selectedAbnormalGun.consecutiveWarningDays}天</Descriptions.Item>
            </Descriptions>

            <Card title="最近30天温度走势" size="small" style={{ marginBottom: 16 }}>
              <ReactECharts option={getGunTrendOption(selectedAbnormalGun.gun.id)} style={{ height: 220 }} />
            </Card>

            <Card title="建议处理动作" size="small">
              <div style={{ padding: '12px 16px', background: selectedAbnormalGun.maxTemp > 75 ? '#fff1f0' : '#fffbe6', borderRadius: 6 }}>
                <ToolOutlined style={{ marginRight: 8, color: selectedAbnormalGun.maxTemp > 75 ? '#ff4d4f' : '#faad14' }} />
                <span style={{ color: selectedAbnormalGun.maxTemp > 75 ? '#ff4d4f' : '#faad14', fontWeight: 500 }}>
                  {selectedAbnormalGun.suggestion}
                </span>
              </div>
            </Card>
          </div>
        )}
      </Modal>
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
