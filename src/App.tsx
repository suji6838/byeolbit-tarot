import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Reading from './components/Reading'
import History from './components/History'
import Auth from './components/Auth'
import { getCoinBalance } from './lib/wallet'
import { confirmPayment, requestCoinCharge } from './lib/toss'

type Tab = 'reading' | 'history'
type Member = { name: string; email: string; picture?: string }

export default function App() {
  const [tab, setTab] = useState<Tab>('reading')
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [readingResetKey, setReadingResetKey] = useState(0)
  const [coins, setCoins] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  const goHome = () => {
    setTab('reading')
    setReadingResetKey((k) => k + 1)
  }

  const refreshCoins = async () => {
    setCoins(await getCoinBalance())
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      if (user) {
        const meta = user.user_metadata ?? {}
        setMember({
          name: meta.full_name || meta.name || user.email || '회원',
          email: user.email ?? '',
          picture: meta.avatar_url || meta.picture,
        })
        await refreshCoins()
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment')
    if (!paymentStatus) return

    const cleanUrl = () => {
      const url = new URL(window.location.href)
      url.search = ''
      window.history.replaceState({}, '', url.toString())
    }

    if (paymentStatus === 'success') {
      const paymentKey = params.get('paymentKey')
      const orderId = params.get('orderId')
      const amount = Number(params.get('amount'))
      if (paymentKey && orderId && amount) {
        confirmPayment({ paymentKey, orderId, amount })
          .then(async (newBalance) => {
            setCoins(newBalance)
            setToast('코인 충전이 완료됐어요!')
          })
          .catch((err) => {
            setToast(err instanceof Error ? err.message : '결제 확인에 실패했어요.')
          })
          .finally(cleanUrl)
      } else {
        cleanUrl()
      }
    } else if (paymentStatus === 'fail') {
      setToast('결제가 취소되었거나 실패했어요.')
      cleanUrl()
    }
  }, [])

  const completeAuth = async (nextMember: Member) => {
    setMember(nextMember)
    await refreshCoins()
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setMember(null)
    setCoins(null)
    setTab('reading')
  }

  const chargeCoins = async () => {
    if (!member) {
      setShowAuth(true)
      return
    }
    try {
      await requestCoinCharge()
    } catch (err) {
      setToast(err instanceof Error ? err.message : '결제 요청에 실패했어요.')
    }
  }

  if (loading) {
    return <div className="loading-view">별빛을 불러오는 중이에요...</div>
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={goHome}>
          <span>✦ 별빛마음상담소</span>
        </button>
        <div className="header-actions">
          {member && (
            <button className="member-button" onClick={chargeCoins} title="코인 충전하기">
              <span>🪙 {coins ?? 0}</span>
            </button>
          )}
          <button className="member-button" onClick={() => setShowAuth(true)}>
            {member ? (
              <>
                {member.picture && <img src={member.picture} alt="" className="member-avatar" referrerPolicy="no-referrer" />}
                <span className="member-name">{member.name}</span>
              </>
            ) : (
              <span>로그인</span>
            )}
          </button>
        </div>
      </header>

      {tab === 'reading' && (
        <Reading key={readingResetKey} loggedIn={!!member} onRequireAuth={() => setShowAuth(true)} onRequireCharge={chargeCoins} />
      )}
      {tab === 'history' && member && <History />}

      <nav className="tabbar">
        <button className={tab === 'reading' ? 'active' : ''} onClick={() => setTab('reading')}>
          <span>🔮</span>상담
        </button>
        <button
          className={tab === 'history' ? 'active' : ''}
          onClick={() => (member ? setTab('history') : setShowAuth(true))}
        >
          <span>📜</span>기록
        </button>
      </nav>

      {showAuth && (
        <Auth
          onClose={() => setShowAuth(false)}
          onComplete={completeAuth}
          member={member}
          onLogout={logout}
        />
      )}

      {toast && (
        <div className="toast">
          {toast}
          <button onClick={() => setToast('')} aria-label="닫기">×</button>
        </div>
      )}
    </div>
  )
}
