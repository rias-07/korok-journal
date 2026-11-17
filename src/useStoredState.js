import { useEffect, useState } from 'react'

const KEY = 'korokJournalV2'
const hasChrome = typeof chrome !== 'undefined' && chrome.storage?.local

async function load() {
  if (hasChrome) {
    const res = await chrome.storage.local.get(KEY)
    return res[KEY]
  }
  const raw = localStorage.getItem(KEY)
  return raw ? JSON.parse(raw) : undefined
}

function save(value) {
  if (hasChrome) return chrome.storage.local.set({ [KEY]: value })
  localStorage.setItem(KEY, JSON.stringify(value))
}

export function useStoredState(initial) {
  const [state, setState] = useState(initial)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    load().then((saved) => {
      if (saved) setState(saved)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (loaded) save(state)
  }, [state, loaded])

  return [state, setState, loaded]
}