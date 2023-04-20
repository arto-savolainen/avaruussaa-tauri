import { emit, listen } from '@tauri-apps/api/event'
import { appWindow } from '@tauri-apps/api/window'

document
  .getElementById('titlebar-minimize')
  .addEventListener('click', () => appWindow.minimize())
document
  .getElementById('titlebar-close')
  .addEventListener('click', () => appWindow.close())

emit('testi', {
  theMessage: 'first emit in ui.js'
})

window.addEventListener("DOMContentLoaded", () => {
  console.log('window.addEventListener')
  emit('loadtest', {
    payload: 'contentloaded'
  })
})

appWindow.listen('DOMContentLoaded', () => {
  console.log('APPWINDOW.LISTEN')
})

listen('loadtest', () => {
  console.log('täällä')
})

appWindow.listen('windowz', () => {
  console.log('received windowz in test.js')
})

appWindow.listen('show-error', (e) => {
  console.log('SHOW ERROR', e.payload)
})