import { appWindow } from '@tauri-apps/api/window'

const activityElement = document.getElementById('activity')
const intervalInput = document.getElementById('interval-input')
const tresholdInput = document.getElementById('treshold-input')
const timerElement = document.getElementById('timer')
const toggleInput = document.getElementById('toggle-input')
const settingsIcon = document.getElementById('settings-icon')
const trayInput = document.getElementById('tray-input')
const stationElement = document.getElementById('station')
const stationIcon = document.getElementById('station-icon')
const stationsTable = document.getElementById('stations-table')
const minimizeButton = document.getElementById('titlebar-minimize')
const closeButton = document.getElementById('titlebar-close')

const mainDiv = document.getElementById('main-page')
const settingsDiv = document.getElementById('settings-page')
const stationsDiv = document.getElementById('stations-page')

// Define URLs for dynamically set images so Vite can include them in production build
const imgUrlBars = new URL('./bars.png', import.meta.url)
const imgUrlArrow = new URL('./arrow.png', import.meta.url)

// Initialize page visibility
mainDiv.style.display = 'block'
settingsDiv.style.display = 'none'
stationsDiv.style.display = 'none'

const bodyStyle = getComputedStyle(document.getElementById('body'))
const defaultFontColor = bodyStyle.color
const defaultFontSize = bodyStyle.fontSize
const defaultBackgroundColor = bodyStyle.backgroundColor

let notificationInterval
let notificationTreshold
let stations
let timer
let updateTime

const switchPage = (page) => {
  switch (page) {
    default:
    case 'main':
      settingsDiv.style.display = 'none'
      stationsDiv.style.display = 'none'
      mainDiv.style.display = 'block'
      settingsIcon.src = imgUrlBars
      break
    case 'settings':
      mainDiv.style.display = 'none'
      stationsDiv.style.display = 'none'
      settingsDiv.style.display = 'block'
      settingsIcon.src = imgUrlArrow
      break
    case 'stations':
      mainDiv.style.display = 'none'
      settingsDiv.style.display = 'none'
      stationsDiv.style.display = 'block'
      settingsIcon.src = imgUrlArrow
      break
  }
}

const getStationActivity = (stationName) => {
  return stations.find(x => x.name === stationName).activity
}

// Receive updated activity value from main process and display it in the main window
const updateActivityStyle = () => {
  const activity = activityElement.innerText

  // If displaying an error message (like station data not available), style the text differently
  if (isNaN(activity)) {
    activityElement.style.color = defaultFontColor // Use default font color when displaying a 'data not found' message
    activityElement.style.fontSize = defaultFontSize // And default font size
    activityElement.style.marginTop = '20px'
    activityElement.style.marginBottom = '20px'
    return
  }

  // Fix activity style from previous not found message, use default styles copied from css at the creation of the renderer
  // Settings a style property to null reverts it back to CSS stylesheet definitions
  activityElement.style.fontSize = null
  activityElement.style.marginTop = null
  activityElement.style.marginBottom = null

  // If activity is at or above treshold, color the displayed value red
  if (activity >= notificationTreshold) {
    activityElement.style.color = 'rgb(235, 53, 53)'
  }
  else {
    // If activity is below alert treshold, color it blue
    activityElement.style.color = 'rgb(23, 23, 252)'
  }
}

const updateActivityElement = (errorMsg) => {
  if (errorMsg) {
    activityElement.innerText = errorMsg
  }
  else {
    activityElement.innerText = getStationActivity(stationElement.innerText)
  }

  updateActivityStyle()
}

// Update the display showing to the user how much time left until the next time activity is updated
const updateTimerDisplay = (time) => {
  time = Math.ceil(time / 1000) // Processing delay is also subtracted in the previous step, round up to fix this

  // Freeze time display at 00:00:00 (or whatever it last was) if something goes wrong
  if (time < 0) {
    return
  }

  let minutes = Math.floor(time / 60)
  let seconds = time - minutes * 60

  // Format the time display to look a little nicer - prepend zeroes if necessary
  minutes = minutes < 10 ? `0${minutes}` : minutes
  seconds = seconds < 10 ? `0${seconds}` : seconds

  timerElement.innerText = `Seuraava päivitys: ${minutes}:${seconds}`
}

// Construct a table showing available observatories for the user to select
const buildStationsTable = () => {
  const buildCell = (row, cellIndex, stationIndex) => {
    const station =  stations[stationIndex]
    const cell = row.insertCell(cellIndex)
    cell.innerText = station.name
    cell.dataset.code = station.code
  }

  const rows = Math.ceil(stations.length / 2)

  for (let i = 0; i < rows; i++) {
    const row = stationsTable.insertRow(i)
    buildCell(row, 0, i * 2)

    // Avoid array out of bounds after the last cell
    if (i * 2 + 1 < stations.length) {
      buildCell(row, 1, i * 2 + 1)
    }
  }
}


// ------------------ IPC RECEIVER FUNCTIONS FOR RENDERER ------------------


// Receive UI configuration data from main process and initialize values
appWindow.listen('ui-set-config', (event) => {
  const config = event.payload
  notificationInterval = config.notificationInterval
  notificationTreshold = config.notificationTreshold
  stations = config.STATIONS

  intervalInput.value = notificationInterval
  tresholdInput.value = notificationTreshold
  trayInput.checked = config.minimizeToTray
  toggleInput.checked = config.notificationToggleChecked
  stationElement.innerText = config.currentStation.name

  // Initialize the station selection page
  buildStationsTable()
})

// Display error if the data fetching request in main script has failed
appWindow.listen('ui-show-error', (event) => {
  updateActivityElement(event.payload)
})

// Receive updated activity data for stations from main script
appWindow.listen('ui-update-activity', (event) => {
  stations = event.payload
  updateActivityElement()
})


// Receive time to the next activity update from main script and run the timer updating UI
appWindow.listen('ui-set-update-timer', (event) => {
  const timeUntilUpdateMs = event.payload
  updateTime = Date.now() + timeUntilUpdateMs

  if (timer) {
    clearInterval(timer)
    timer = null
  }

  updateTimerDisplay(timeUntilUpdateMs)

  timer = setInterval(() => {
    updateTimerDisplay(updateTime - Date.now())
  }, 1000);
})


// ------------------ EVENT LISTENERS FOR interval-input -------------------


// Save last valid input when user clicks outside of the interval input element
intervalInput.addEventListener('focusout', (event) => {
  intervalInput.value = notificationInterval
})

// Validate that user input for the interval input element is a number
intervalInput.addEventListener('change', (event) => {
  if (isNaN(event.target.value) || isNaN(parseFloat(event.target.value))  || event.target.value < 0) {
    intervalInput.value = notificationInterval
  }
  else {
    notificationInterval = event.target.value.trim()
    appWindow.emit('set-notification-interval', notificationInterval)
  }
})


// ------------------ EVENT LISTENERS FOR treshold-input -------------------


// Save last valid input when user clicks outside of the interval input element
tresholdInput.addEventListener('focusout', (event) => {
  tresholdInput.value = notificationTreshold
})


// Validate that user input for the interval input element is a positive number
tresholdInput.addEventListener('change', (event) => {
  if (isNaN(event.target.value) || isNaN(parseFloat(event.target.value)) || event.target.value < 0) {
    tresholdInput.value = notificationTreshold
  }
  else {
    notificationTreshold = event.target.value.trim()
    appWindow.emit('set-notification-treshold', notificationTreshold)
    updateActivityStyle()
  }
})


// -------- SHARED EVENT LISTENERS FOR interval-input AND treshold-input --------


const setSharedEventListeners = (element) => {

  // Clear input box when user clicks on it
  element.addEventListener('click', (event) => {
    element.value = ''
  })

  // Limit length of text in input box to 5 characters and prevent whitespace
  element.addEventListener('input', (event) => {
    element.value = event.target.value.trim()

    if (event.target.value.length > 5) {
      element.value = event.target.value.substr(0, 5)
    }
  })

  // Lose focus on element if user presses enter or esc.
  element.addEventListener("keydown", (event) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      element.blur()
    }
  })
}

setSharedEventListeners(intervalInput)
setSharedEventListeners(tresholdInput)


// ------------------ EVENT LISTENERS FOR toggle-input -------------------


// When user clicks the toggle to enable or disable notifications
toggleInput.addEventListener('click', (event) => {
  appWindow.emit('set-notification-toggle', toggleInput)
})


// ------------------ EVENT LISTENERS FOR tray-input -------------------


// When user clicks the toggle to enable or disable minimize to tray
trayInput.addEventListener('click', (event) => {
  appWindow.emit('set-tray-toggle', trayInput.checked)
})


// ------------------ EVENT LISTENERS FOR settings-icon -------------------


// When user clicks the settings icon
settingsIcon.addEventListener('click', (event) => {
  // If in main page, switch to settings page
  if (mainDiv.style.display === 'block') {
    switchPage('settings')
  }
  // If in settings or stations page, switch back to main page
  else {
    switchPage('main')
  }
})


// ------------------ EVENT LISTENERS FOR station-icon -------------------


// When user clicks the station icon, hide main page and show the stations page
stationIcon.addEventListener('click', (event) => {
  switchPage('stations')
})


// ------------------ EVENT LISTENERS FOR stations-table -------------------


// When user clicks a cell in the stations table to select an observatory it's handled here
stationsTable.addEventListener('click', (event) => {
  const cell = event.target.closest('td')

  // Did not click on a cell but somewhere else in the table
  if (!cell) {
    return
  }

  appWindow.emit('set-station', cell.dataset.code) // Inform main process of station change
  stationElement.innerText = cell.innerText // Set station in UI
  updateActivityElement() // Show activity for the new station

  // Switch back to main page
  switchPage('main')
})


// ------------------ EVENT LISTENERS FOR titlebar-buttons -------------------


minimizeButton.addEventListener('click', () => {
  appWindow.emit('minimize')

  minimizeButton.style.backgroundColor = defaultBackgroundColor // Workaround
})

// background-color set with :hover doesn't properly reset when window is unminimized, so we implement our own :hover
minimizeButton.addEventListener('mouseenter', () => {
  minimizeButton.style.backgroundColor = '#343434'
})

minimizeButton.addEventListener('mouseleave', () => {
  minimizeButton.style.backgroundColor = defaultBackgroundColor
})

closeButton.addEventListener('click', () => {
  appWindow.emit('close')
})


// ------------------ EVENT LISTENER FOR DEFAULT CONTEXT MENU -------------------


// Disable webview default context menu on right-click
document.addEventListener('contextmenu', event => event.preventDefault())