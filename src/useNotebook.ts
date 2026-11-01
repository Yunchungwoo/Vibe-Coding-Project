import { useEffect, useRef, useState } from 'react'
import { emptyNotebook, parseNotebook, STORAGE_KEY, type Notebook } from './model'
export type SaveState = 'saved' | 'saving' | 'failed'
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    try { return { book: raw === null ? emptyNotebook() : parseNotebook(raw), issue: '' } }
    catch { return { book: emptyNotebook(), issue: '저장된 글을 읽을 수 없어요. 데이터가 손상되었거나 지원하지 않는 형식이에요. 기존 데이터는 그대로 보존했어요.' } }
  } catch { return { book: emptyNotebook(), issue: '이 브라우저의 저장 공간에 접근할 수 없어요. 브라우저의 저장 권한을 확인해주세요.' } }
}
export function useNotebook() {
  const [initial] = useState(load)
  const [book, setBook] = useState(initial.book)
  const [status, setStatus] = useState<SaveState>(initial.issue ? 'failed' : 'saved')
  const [issue, setIssue] = useState(initial.issue)
  const latest = useRef(book)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blocked = useRef(!!initial.issue)
  const dirty = useRef(false)
  const lastRaw = useRef<string | null | undefined>(undefined)
  // Capture the loaded snapshot to avoid overwriting changes made in another tab.
  if (lastRaw.current === undefined) {
    try { lastRaw.current = localStorage.getItem(STORAGE_KEY) } catch { lastRaw.current = null }
  }
  function cancel() { if (timer.current) clearTimeout(timer.current); timer.current = null }
  function persist(next: Notebook) {
    cancel()
    if (blocked.current) { setStatus('failed'); return false }
    try {
      if (localStorage.getItem(STORAGE_KEY) !== lastRaw.current) {
        blocked.current = true
        setIssue('다른 탭에서 보관함이 변경되었어요. 이곳의 작성 내용을 복사한 뒤 새로고침해주세요. 기존 글은 덮어쓰지 않았어요.')
        setStatus('failed'); return false
      }
      const raw = JSON.stringify(next)
      localStorage.setItem(STORAGE_KEY, raw)
      lastRaw.current = raw
      dirty.current = false
      setStatus('saved'); return true
    } catch { setStatus('failed'); return false }
  }
  function update(next: Notebook) {
    latest.current = next; setBook(next); dirty.current = true; cancel(); setStatus('saving')
    timer.current = setTimeout(() => persist(latest.current), 400)
  }
  function commit(next: Notebook) {
    if (!persist(next)) return false
    latest.current = next; setBook(next); return true
  }
  useEffect(() => {
    const flush = () => { if (dirty.current) persist(latest.current) }
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty.current && !persist(latest.current)) { e.preventDefault(); e.returnValue = '' }
    }
    const visibility = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', unload)
    document.addEventListener('visibilitychange', visibility)
    return () => { cancel(); window.removeEventListener('pagehide', flush); window.removeEventListener('beforeunload', unload); document.removeEventListener('visibilitychange', visibility) }
  }, []) // Reads current data through refs, including during navigation/reload.
  return { book, update, commit, status, issue, retry: () => persist(latest.current) }
}
