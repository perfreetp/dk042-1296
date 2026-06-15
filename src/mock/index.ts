import Mock from 'mockjs'
import type { Station, Gun, TempRecord, WorkOrder, WeatherData, StationRank, Rectification } from '../types'

const Random = Mock.Random

const areas = ['朝阳区', '海淀区', '丰台区', '东城区', '西城区', '通州区']
const managers = ['张伟', '李娜', '王强', '刘洋', '陈明', '赵静']
const gunModels = ['比亚迪DC-120kW', '特斯拉V3-250kW', '国电南瑞-180kW', '星星充电-150kW', '特来电-200kW']
const workOrderTypes = ['枪线过热', '连接器松动', '模块故障', '通讯异常', '显示屏故障']
const weatherTypes = ['晴', '多云', '阴', '小雨', '雷阵雨']

function generateStations(): Station[] {
  const stations: Station[] = []
  const stationNames = [
    '国贸充电站', '中关村充电站', '丰台科技园站', '东直门枢纽站',
    '金融街充电站', '通州万达站', '望京SOHO站', '三里屯站',
    '西直门站', '五道口站', '亦庄开发区站', '亚运村站'
  ]

  stationNames.forEach((name, index) => {
    const totalGuns = Random.integer(6, 20)
    const highTempGuns = Random.integer(0, Math.floor(totalGuns * 0.3))
    const warningGuns = Random.integer(0, Math.floor(totalGuns * 0.2))
    const normalGuns = totalGuns - highTempGuns - warningGuns
    
    let status: Station['status'] = 'normal'
    if (highTempGuns > 3) status = 'danger'
    else if (highTempGuns > 1 || warningGuns > 3) status = 'warning'

    stations.push({
      id: `ST${String(index + 1).padStart(3, '0')}`,
      name,
      address: `${areas[index % areas.length]}${Random.csentence(6, 12)}`,
      area: areas[index % areas.length],
      lng: 116.3 + Random.float(0, 0.4, 2, 4),
      lat: 39.8 + Random.float(0, 0.3, 2, 4),
      totalGuns,
      highTempGuns,
      warningGuns,
      normalGuns: Math.max(0, normalGuns),
      status,
      manager: managers[index % managers.length],
      phone: `138${Random.string('number', 8)}`,
      buildTime: Random.date('yyyy-MM-dd'),
    })
  })

  return stations
}

function generateGuns(stations: Station[]): Gun[] {
  const guns: Gun[] = []
  let gunId = 1

  stations.forEach(station => {
    for (let i = 1; i <= station.totalGuns; i++) {
      const model = gunModels[Random.integer(0, gunModels.length - 1)]
      const powerMatch = model.match(/(\d+)kW/)
      const power = powerMatch ? parseInt(powerMatch[1]) : 120
      
      let currentTemp = Random.float(25, 55, 1, 1)
      let status: Gun['status'] = 'normal'
      
      if (i <= station.highTempGuns) {
        currentTemp = Random.float(65, 85, 1, 1)
        status = 'danger'
      } else if (i <= station.highTempGuns + station.warningGuns) {
        currentTemp = Random.float(55, 65, 1, 1)
        status = 'warning'
      }

      guns.push({
        id: `G${String(gunId).padStart(4, '0')}`,
        stationId: station.id,
        stationName: station.name,
        gunNo: `A${String(i).padStart(2, '0')}`,
        model,
        power,
        currentTemp,
        maxTemp: Random.float(currentTemp, currentTemp + 15, 1, 1),
        avgTemp: Random.float(currentTemp - 10, currentTemp, 1, 1),
        status,
        lastCheckTime: Random.datetime('yyyy-MM-dd HH:mm:ss'),
        totalWorkHours: Random.integer(1000, 8000),
      })
      gunId++
    }
  })

  return guns
}

function generateTempRecords(guns: Gun[]): TempRecord[] {
  const records: TempRecord[] = []
  const now = new Date()

  guns.slice(0, 10).forEach(gun => {
    for (let day = 29; day >= 0; day--) {
      for (let hour = 6; hour <= 22; hour += 2) {
        const date = new Date(now)
        date.setDate(date.getDate() - day)
        date.setHours(hour, 0, 0, 0)

        const baseTemp = 35 + Math.sin((hour - 6) / 16 * Math.PI) * 20
        const tempVariation = Random.float(-5, 5, 1, 1)
        const ambientTemp = 25 + Math.sin((hour - 6) / 16 * Math.PI) * 10 + Random.float(-3, 3, 1, 1)

        records.push({
          time: date.toISOString(),
          stationId: gun.stationId,
          gunId: gun.id,
          temperature: Math.max(20, Math.min(90, baseTemp + tempVariation + (gun.status === 'danger' ? 15 : gun.status === 'warning' ? 5 : 0))),
          power: Random.float(gun.power * 0.3, gun.power, 0, 0),
          ambientTemp,
        })
      }
    }
  })

  return records
}

function generateWorkOrders(stations: Station[], guns: Gun[]): WorkOrder[] {
  const orders: WorkOrder[] = []
  const statuses: WorkOrder['status'][] = ['pending', 'processing', 'completed', 'closed']

  for (let i = 1; i <= 80; i++) {
    const gun = guns[Random.integer(0, guns.length - 1)]
    const status = statuses[Random.integer(0, statuses.length - 1)]
    const createTime = Random.datetime('yyyy-MM-dd HH:mm:ss')
    const assignTime = new Date(new Date(createTime).getTime() + Random.integer(10, 60) * 60 * 1000).toISOString()
    const completeTime = status === 'completed' || status === 'closed'
      ? new Date(new Date(assignTime).getTime() + Random.integer(1, 24) * 60 * 60 * 1000).toISOString()
      : ''

    orders.push({
      id: `WO${String(i).padStart(5, '0')}`,
      stationId: gun.stationId,
      stationName: gun.stationName,
      gunId: gun.id,
      gunNo: gun.gunNo,
      type: workOrderTypes[Random.integer(0, workOrderTypes.length - 1)],
      level: ['low', 'medium', 'high'][Random.integer(0, 2)] as WorkOrder['level'],
      status,
      createTime,
      assignTime,
      completeTime,
      handler: managers[Random.integer(0, managers.length - 1)],
      description: Random.csentence(10, 30),
      recurrence: Random.integer(0, 5),
    })
  }

  return orders
}

function generateWeatherData(): WeatherData[] {
  const data: WeatherData[] = []
  const now = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    data.push({
      date: date.toISOString().split('T')[0],
      temperature: Random.float(20, 38, 1, 1),
      humidity: Random.float(40, 90, 0, 0),
      weather: weatherTypes[Random.integer(0, weatherTypes.length - 1)],
    })
  }

  return data
}

function generateStationRanks(stations: Station[], workOrders: WorkOrder[]): StationRank[] {
  return stations.map(station => {
    const stationOrders = workOrders.filter(wo => wo.stationId === station.id)
    const completedOrders = stationOrders.filter(wo => wo.status === 'completed' || wo.status === 'closed')
    const completionRate = stationOrders.length > 0 
      ? Math.round((completedOrders.length / stationOrders.length) * 100) 
      : 100

    const avgResponseTime = completedOrders.length > 0
      ? Math.round(completedOrders.reduce((sum, wo) => {
          const diff = new Date(wo.assignTime).getTime() - new Date(wo.createTime).getTime()
          return sum + diff / (1000 * 60)
        }, 0) / completedOrders.length)
      : 30

    const score = Math.round(
      100 
      - station.highTempGuns * 5 
      - station.warningGuns * 2 
      - stationOrders.length * 0.5
      + completionRate * 0.3
      - avgResponseTime * 0.1
    )

    return {
      stationId: station.id,
      stationName: station.name,
      area: station.area,
      score: Math.max(0, Math.min(100, score)),
      highTempCount: station.highTempGuns,
      workOrderCount: stationOrders.length,
      completionRate,
      avgResponseTime,
      manager: station.manager,
    }
  }).sort((a, b) => b.score - a.score)
}

function generateRectifications(stations: Station[], guns: Gun[]): Rectification[] {
  const rectifications: Rectification[] = []
  
  for (let i = 1; i <= 15; i++) {
    const gun = guns[Random.integer(0, guns.length - 1)]
    
    rectifications.push({
      id: `REC${String(i).padStart(4, '0')}`,
      stationId: gun.stationId,
      stationName: gun.stationName,
      gunId: gun.id,
      issue: workOrderTypes[Random.integer(0, workOrderTypes.length - 1)],
      beforeDesc: `整改前：枪线温度偏高，最高达${Random.float(70, 85, 1, 1)}℃，存在安全隐患`,
      afterDesc: `整改后：更换散热模块，温度稳定在${Random.float(35, 50, 1, 1)}℃，运行正常`,
      beforeTemp: Random.float(70, 85, 1, 1),
      afterTemp: Random.float(35, 50, 1, 1),
      rectifyTime: Random.datetime('yyyy-MM-dd HH:mm:ss'),
      operator: managers[Random.integer(0, managers.length - 1)],
    })
  }

  return rectifications
}

export const mockStations = generateStations()
export const mockGuns = generateGuns(mockStations)
export const mockTempRecords = generateTempRecords(mockGuns)
export const mockWorkOrders = generateWorkOrders(mockStations, mockGuns)
export const mockWeatherData = generateWeatherData()
export const mockStationRanks = generateStationRanks(mockStations, mockWorkOrders)
export const mockRectifications = generateRectifications(mockStations, mockGuns)
