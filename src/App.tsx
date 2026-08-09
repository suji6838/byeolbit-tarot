import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Reading from './components/Reading'
import History from './components/History'
import Auth from './components/Auth'

type Tab = 'reading' | 'history'
type Member = { name: string; email: string; picture?: string }

export default function App() {
  const [tab, setTab] = useState<Tab>('reading')
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (user) {
        const meta = user.user_metadata ?? {}
        setMember({
          name: meta.full_name || meta.name || user.email || '회원',
          email: user.email ?? '',
          picture: meta.avatar_url || meta.picture,
        })
      }
      setLoading(false)
    })
  }, [])

  const completeAuth = async (nextMember: Member) => {
    setMember(nextMember)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setMember(null)
  }

  if (loading) {
    return <div className="loading-view">별빛을 불러오는 중이에요...</div>
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('reading')}>
          <span>✦ 별빛마음상담소</span>
        </button>
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
      </header>

      {tab === 'reading' && <Reading loggedIn={!!member} onRequireAuth={() => setShowAuth(true)} />}
      {tab === 'history' && <History loggedIn={!!member} onRequireAuth={() => setShowAuth(true)} />}

      <nav className="tabbar">
        <button className={tab === 'reading' ? 'active' : ''} onClick={() => setTab('reading')}>
          <span>🔮</span>상담
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
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
    </div>
  )
}
