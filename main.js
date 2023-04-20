import { emit, listen } from '@tauri-apps/api/event'
import { appWindow } from '@tauri-apps/api/window'
import { sendNotification } from '@tauri-apps/api/notification'
import axios from 'axios'

const APP_BACKGROUND_COLOR = '#151515'
const APP_TEXT_COLOR = '#404040'
const TEN_MINUTES_MS = 10 * 60 * 1000
const HOURS_TO_MS = 60 * 60 * 1000
const STATIONS = [
  {
    name: 'Kevo', code: 'KEV'
  },
  {
    name: 'Kilpisjärvi', code: 'KIL'
  },
  {
    name: 'Ivalo', code: 'IVA'
  },
  {
    name: 'Muonio', code: 'MUO'
  },
  {
    name: 'Sodankylä', code: 'SOD'
  },
  {
    name: 'Pello', code: 'PEL'
  },
  {
    name: 'Ranua', code: 'RAN'
  },
  {
    name: 'Oulujärvi', code: 'OUJ'
  },
  {
    name: 'Mekrijärvi', code: 'MEK'
  },
  {
    name: 'Hankasalmi', code: 'HAN'
  },
  {
    name: 'Nurmijärvi', code: 'NUR'
  },
  {
    name: 'Tartto', code: 'TAR'
  },
]
let mainWindow
let notificationTreshold = 0.4 // Default value, let user change this. In reality likelyhood depends on observatory location
let notificationInterval = 1 // Minimum time between notifications in hours
let minimizeToTray = true
let intervalTimer
let intervalTimerStart
let suppressNotification = false
let notificationToggleChecked = true
let firstAlert = true
let currentStation = STATIONS[10] // Default station Nurmijärvi
let tray = null
let stationsCache


const startIntervalTimer = (time) => {
  if (intervalTimer) {
    clearTimeout(intervalTimer)
  }

  intervalTimer = setTimeout(() => {
    suppressNotification = false
    intervalTimer = null
    intervalTimerStart = null
  }, time)
}


const showNotification = (activity) => {
  // Don't show notification if notificationInterval time has not elapsed since the last one, and it's not the first notification.
  // Or if user has toggled notifications off.
  if ((suppressNotification && !firstAlert) || !notificationToggleChecked) {
    return
  }

  firstAlert = false

  sendNotification({
    title: 'Revontulet todennäköisiä',
    body: `Magneettinen aktiivisuus @ ${currentStation.name}: ${activity} nT/s`,
    icon: './app-icon.png'
  })

  if (notificationInterval > 0) {
    suppressNotification = true
    intervalTimerStart = new Date()
    startIntervalTimer(notificationInterval * HOURS_TO_MS)
  }
}


const fetchData = async () => {
  let response

  // Get data for all stations
  try {
    response = await axios.get('https://www.ilmatieteenlaitos.fi/revontulet-ja-avaruussaa', {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error(`Error: ${error.message}`)
    appWindow.emit('show-error', `Error: ${error.message}`)
    return
  }

  const responseBody = response.data // html+javascript response which includes the data we want

  // Find activity for each station and add station data to cache
  for (const station of STATIONS) {
    const splitString = `${station.code}\\\":{\\\"dataSeries\\\":` // Data starts after this string
    let data = responseBody.split(splitString) // Split response string where the data for our monitoring station begins
    let activity

    // If data for current station was not found 
    if (data.length < 2) {
      activity = `Aseman ${station.name} havainnot ovat tilapäisesti pois käytöstä.`
      stationsCache.push({ name: station.name, code: station.code, activity })
      continue
    }

    data = data[1].split('}', 1) // Split again where the data we want ends, discarding everything after it
    data = JSON.parse(data[0]) // Transform string to a javascript object. Now we have our data in an array.
    activity = data[data.length - 1][1]

    // Sodankylän viimeinen mittaustulos on datassa välillä null, käytetään toiseksi viimeistä
    if (!activity) {
      activity = data[data.length - 2][1]

      // Jos vieläkin kusee...
      if (!activity) {
        activity = `Aseman ${station.name} data ei tilapäisesti ole saatavilla, yritä myöhemmin uudelleen.`
      }
    }

    stationsCache.push({ name: station.name, code: station.code, activity })

    if (station.code === currentStation.code) {
      currentStation.activity = activity
    }
  }
}


const clearCache = () => {
  stationsCache = []
}


const updateData = async () => {
  // Clear old stations data
  clearCache()

  // Populate cache with updated stations data
  await fetchData()

  // Show desktop notification about activity
  if (!isNaN(currentStation.activity) && currentStation.activity >= notificationTreshold) {
    showNotification(currentStation.activity)
  }

  // Send updated data to renderer
  appWindow.emit('update-activity', stationsCache)
}


// Send configuration parameters to UI, then get data and send that as well
const initializeUI = (window) => {
  window.webContents.send('set-config',
    {
      notificationTreshold, notificationInterval, notificationToggleChecked, minimizeToTray, STATIONS, currentStation
    }
  )

  // Get activity data, show notification if needed and send data to the renderer
  updateData()
}


window.addEventListener("DOMContentLoaded", () => {

  appWindow.emit('windowz', {
    message: 'lololo'
  })
})














listen('testi', (event) => {
  console.log('event:', event)
})

listen('loadtest', (event) => {
  console.log('calling updateData')
  updateData()
  console.log('past the updateData call now')
})

