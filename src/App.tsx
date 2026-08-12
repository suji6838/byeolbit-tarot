import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Reading from './components/Reading'
import History from './components/History'
import Auth from './components/Auth'
import ChargeModal from './components/ChargeModal'
import AdminCharges from './components/AdminCharges'
import ResetPassword from './components/ResetPassword'
import LegalModal from './components/LegalModal'
import { getCoinBalance } from './lib/wallet'
import { ADMIN_EMAIL } from './config'

type Tab = 'reading' | 'history'
type Member = { name: string; email: string; picture?: string }

export default function App() {
  const [tab, setTab] = useState<Tab>('reading')
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [showCharge, setShowCharge] = useState(false)
  const [showAdminCharges, setShowAdminCharges] = useState(false)
  const [readingResetKey, setReadingResetKey] = useState(0)
  const [coins, setCoins] = useState<number | null>(null)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [legalView, setLegalView] = useState<'terms' | 'privacy' | null>(null)

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
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setShowResetPassword(true)
    })
    return () => sub.subscription.unsubscribe()
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

  const chargeCoins = () => {
    if (!member) {
      setShowAuth(true)
      return
    }
    setShowCharge(true)
  }

  const closeCharge = () => {
    setShowCharge(false)
    void refreshCoins()
  }

  if (loading) {
    return (
      <>
        <div className="loading-view">별빛을 불러오는 중이에요...</div>
        {showResetPassword && (
          <ResetPassword
            onDone={async () => {
              setShowResetPassword(false)
              await refreshCoins()
            }}
          />
        )}
      </>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={goHome}>
          <span>✦ 별빛마음상담소</span>
        </button>
        <div className="header-actions">
          {member?.email === ADMIN_EMAIL && (
            <button className="member-button" onClick={() => setShowAdminCharges(true)} title="충전 요청 승인">
              <span>🛠</span>
            </button>
          )}
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
        <Reading
          key={readingResetKey}
          loggedIn={!!member}
          onRequireAuth={() => setShowAuth(true)}
          onRequireCharge={chargeCoins}
          onCoinsChange={setCoins}
        />
      )}
      {tab === 'history' && member && <History />}

      <footer className="site-footer legal-footer-links">
        <button type="button" onClick={() => setLegalView('terms')}>이용약관</button><span>·</span>
        <button type="button" onClick={() => setLegalView('privacy')}>개인정보처리방침</button><span>·</span>
        <a href={`mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent('별빛마음상담소 문의')}`}>문의하기</a>
      </footer>

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

      {showCharge && <ChargeModal onClose={closeCharge} />}

      {showAdminCharges && (
        <AdminCharges onClose={() => setShowAdminCharges(false)} onBalanceChange={refreshCoins} />
      )}

      {showResetPassword && (
        <ResetPassword
          onDone={async () => {
            setShowResetPassword(false)
            await refreshCoins()
          }}
        />
      )}

      {legalView && <LegalModal doc={legalView} onClose={() => setLegalView(null)} />}
    </div>
  )
}
