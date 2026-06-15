import { useState, useEffect } from 'react'
import { Menu, Avatar, Dropdown, Badge, Select } from 'antd'
import {
  EnvironmentOutlined,
  LineChartOutlined,
  FileTextOutlined,
  TrophyOutlined,
  FileSearchOutlined,
  BellOutlined,
  UserOutlined,
  DownOutlined,
} from '@ant-design/icons'
import StationMap from './pages/StationMap'
import TrendAnalysis from './pages/TrendAnalysis'
import WorkOrderTrack from './pages/WorkOrderTrack'
import BenchmarkRanking from './pages/BenchmarkRanking'
import ReviewReport from './pages/ReviewReport'
import { mockStations } from './mock'

type PageKey = 'map' | 'trend' | 'workorder' | 'benchmark' | 'review'

interface TrendDrillParams {
  area?: string
  stationId?: string
  activeTab?: string
}

function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('map')
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [trendDrillParams, setTrendDrillParams] = useState<TrendDrillParams | null>(null)

  const menuItems = [
    { key: 'map', icon: <EnvironmentOutlined />, label: '站点地图' },
    { key: 'trend', icon: <LineChartOutlined />, label: '趋势分析' },
    { key: 'workorder', icon: <FileTextOutlined />, label: '工单追踪' },
    { key: 'benchmark', icon: <TrophyOutlined />, label: '对标排行' },
    { key: 'review', icon: <FileSearchOutlined />, label: '复盘报告' },
  ]

  const areas = ['all', ...new Set(mockStations.map(s => s.area))]

  const handleNavigateToTrend = (params: TrendDrillParams) => {
    if (params.area) {
      setSelectedArea(params.area)
    }
    setTrendDrillParams(params)
    setCurrentPage('trend')
  }

  const handleAreaChange = (area: string) => {
    setSelectedArea(area)
  }

  const handleClearTrendDrill = () => {
    setTrendDrillParams(null)
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'map':
        return (
          <StationMap
            selectedArea={selectedArea}
            onNavigateToTrend={handleNavigateToTrend}
          />
        )
      case 'trend':
        return (
          <TrendAnalysis
            selectedArea={selectedArea}
            onAreaChange={handleAreaChange}
            drillParams={trendDrillParams}
            onClearDrill={handleClearTrendDrill}
          />
        )
      case 'workorder':
        return <WorkOrderTrack selectedArea={selectedArea} />
      case 'benchmark':
        return (
          <BenchmarkRanking
            selectedArea={selectedArea}
            onAreaChange={handleAreaChange}
          />
        )
      case 'review':
        return <ReviewReport selectedArea={selectedArea} />
      default:
        return <StationMap selectedArea={selectedArea} onNavigateToTrend={handleNavigateToTrend} />
    }
  }

  const getPageTitle = () => {
    const titles: Record<PageKey, string> = {
      map: '站点地图 - 区域高温枪位分布',
      trend: '趋势分析 - 温升规律与设备对比',
      workorder: '工单追踪 - 高频复发与处理效率',
      benchmark: '对标排行 - 站点管理差异分析',
      review: '复盘报告 - 整改沉淀与安全总结',
    }
    return titles[currentPage]
  }

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-logo">
          <EnvironmentOutlined style={{ marginRight: 8 }} />
          充电站分析平台
        </div>
        <div className="sidebar-menu">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[currentPage]}
            items={menuItems}
            onClick={({ key }) => setCurrentPage(key as PageKey)}
            style={{ borderRight: 'none' }}
          />
        </div>
      </div>

      <div className="main-content">
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div className="header-title">{getPageTitle()}</div>
            <Select
              value={selectedArea}
              onChange={setSelectedArea}
              style={{ width: 150 }}
              options={areas.map(area => ({
                value: area,
                label: area === 'all' ? '全部区域' : area,
              }))}
            />
          </div>
          <div className="header-right">
            <Badge count={5} size="small">
              <BellOutlined style={{ fontSize: 20, color: '#666', cursor: 'pointer' }} />
            </Badge>
            <Dropdown
              menu={{
                items: [
                  { key: 'profile', label: '个人中心' },
                  { key: 'settings', label: '系统设置' },
                  { type: 'divider' },
                  { key: 'logout', label: '退出登录' },
                ],
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar size={32} icon={<UserOutlined />} />
                <span>区域经理</span>
                <DownOutlined style={{ fontSize: 12 }} />
              </div>
            </Dropdown>
          </div>
        </div>

        <div className="content-wrapper">
          {renderPage()}
        </div>
      </div>
    </div>
  )
}

export default App
