import { emit, listen } from '@tauri-apps/api/event'
import { appWindow } from '@tauri-apps/api/window'
import { sendNotification } from '@tauri-apps/api/notification'
import axios from 'axios'

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
let minimizeToTray = false // DEV VALUE, VAIHDA TRUE !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
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
  appWindow.emit('ui-update-activity', stationsCache)
}


// Send configuration parameters to UI, then get data and send that as well
const initializeUI = () => {
  appWindow.emit('ui-set-config',
    {
      notificationTreshold, notificationInterval, notificationToggleChecked, minimizeToTray, STATIONS, currentStation
    }
  )

  // Get activity data, show notification if needed and send data to UI
  updateData()
}


//  REMEMBER 
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// SET ICON


// const createTray = () => {
//   let tray = new Tray(path.join(__dirname, "app-icon.png"))

//   // Menu when right-clicking tray icon
//   const contextMenu = Menu.buildFromTemplate([
//     {
//       label: 'Show', click: () => {
//         mainWindow.show()
//       }
//     },
//     {
//       label: 'Quit', click: () => {
//         app.quit()
//       }
//     }
//   ])

//   tray.on('double-click', (event) => {
//     mainWindow.show()
//   })

//   tray.setToolTip('Avaruussää')
//   tray.setContextMenu(contextMenu)

//   return tray
// }


// ------------------ PROGRAM EXECUTION STARTS HERE ------------------


window.addEventListener("DOMContentLoaded", () => {
  initializeUI()

  // ----------------------------------
  // Set timers for data fetching below
  // ----------------------------------

  // The website we get data from updates every ten minutes past the hour. Se we need to set a timer that triggers a data
  // fetching operation just after that update. However, the site can take a bit of time to update (up to some tens of seconds).
  // Here we get how many minutes until update happens from the present moment.
  let time = new Date()
  // Calculate how many minutes to the next time minutes are divisible by 10 (ie. 00, 10, 20 etc.)
  let offsetMinutes = 10 - (time.getMinutes() % 10 === 0 ? 10 : time.getMinutes() % 10)
  // How many seconds to a full minute? By adding this to offsetMinutes we give the site a 1 minute buffer to update
  const offsetSeconds = 60 - time.getSeconds()
  // Time in milliseconds until the clock is 11 minutes past, 21 past, etc.
  const timeUntilUpdateMs = (offsetMinutes * 60 + offsetSeconds) * 1000

  // Set timer to trigger data fetching at the right time.
  setTimeout(() => {
    // Here time is about 1 minute after assumed site update. Now we set a timer that will run through the lifetime of the program
    // and call the data fetch function every 10 minutes.
    setInterval(() => {
      updateData()
      appWindow.emit('ui-set-update-timer', TEN_MINUTES_MS)
    }, TEN_MINUTES_MS);

    // Datafetch at the calculated time, after this fetching will happen at 10 minute intervals
    updateData()
    appWindow.emit('ui-set-update-timer', TEN_MINUTES_MS)
  }, timeUntilUpdateMs)

  // Send update timer info to UI
  appWindow.emit('ui-set-update-timer', timeUntilUpdateMs)
})


// ------------------ USER ACTION HANDLERS ------------------


// Tray stuff
appWindow.listen('minimize', (event) => {
  if (minimizeToTray) {
    event.preventDefault()
    mainWindow.hide()
    tray = 'createTray() placeholder'
  }
  else {
    appWindow.minimize()
  }
})

appWindow.listen('close', () => {
  appWindow.close()
})

// mainWindow.on('restore', (event) => {
//   if (tray) {
//     mainWindow.show()
//     tray.destroy()
//   }
// })


// ------------------ HANDLE EVENTS FROM UI SCRIPT ------------------


// Triggers when the user sets a new value for the minimum delay between notifications
appWindow.listen('set-interval', (event) => {
  const newInterval = event.payload

  if (intervalTimerStart) {
    // With this the notification suppression timer behaves as if the old timer was started with the new interval
    const timeLeft = (intervalTimerStart.getTime() + newInterval * HOURS_TO_MS) - Date.now()

    // If there's suppression time left with the new interval
    if (timeLeft > 0) {
      startIntervalTimer(timeLeft)
    }
    // If notification would have cleared already with the new interval
    else {
      clearTimeout(intervalTimer) // Not strictly necessary I guess, just clear redundant timer
      suppressNotification = false
      intervalTimer = null
      intervalTimerStart = null
    }
  }

  notificationInterval = newInterval
})

// Triggers when user sets a new value for the notification treshold
// event.payload === newTreshold
appWindow.listen('set-treshold', (event) => {
  notificationTreshold = event.payload
})

// Triggers when user clicks the notifications on / off toggle
// event.payload === checked
appWindow.listen('set-toggle', (event) => {
  notificationToggleChecked = event.payload
})

// Triggers when user clicks the minimize to tray on / off toggle
// event.payload === checked
appWindow.listen('set-tray-toggle', (event) => {
  minimizeToTray = event.payload
})

// Triggers when user clicks a cell in the stations list table
// event.payload === newStationCode
appWindow.listen('set-station', (event) => {
  currentStation = stationsCache.find(x => x.code === event.payload)
})


// ------------------ MISC ------------------


// app.on('quit', () => {
//   if (tray) {
//     tray.destroy()
//   }
// })
// Remember to destroy tray if necessary