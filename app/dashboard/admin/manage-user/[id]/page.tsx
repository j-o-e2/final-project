"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ManageUserPage({ params }: any) {
  const resolvedParams = use(params)
  const { id } = resolvedParams as { id: string }
  const userId = id
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [badgeKey, setBadgeKey] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await supabase.auth.getSession()
        const sess = data?.session
        setSession(sess)
        // Determine admin status by checking the current user's profile row
        let isAdmin = false
        if (sess?.user?.id) {
          try {
            const { data: meProfile, error: meErr } = await supabase.from('profiles').select('role').eq('id', sess.user.id).single()
            if (!meErr && meProfile?.role === 'admin') isAdmin = true
          } catch (e) {
            // ignore
          }
        }
        setIsAuthenticated(!!sess && isAdmin)
        if (!sess || !isAdmin) {
          setMessage('Not authenticated as admin')
          setLoading(false)
          return
        }
        // Fetch profile
        const { data: profileData, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
        if (!error) setProfile(profileData)
        // Clear transient messages
        setTimeout(() => setMessage(null), 1500)
      } catch (err: any) {
        setMessage('Error: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  const doVerify = async (opts: { email?: boolean; phone?: boolean; contact?: boolean }) => {
    setMessage(null)
    setActionLoading(true)
    try {
      if (!session) {
        setMessage('Not authenticated')
        setActionLoading(false)
        return
      }
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId, ...opts }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setMessage('Updated: ' + JSON.stringify(json.data || json))
      // refresh profile
      const profileRes = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (!profileRes.error) setProfile(profileRes.data)
    } catch (err: any) {
      setMessage('Error: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const doBadge = async () => {
    if (!badgeKey) return setMessage('Enter badge key')
    setMessage(null)
    setActionLoading(true)
    try {
      if (!session) {
        setMessage('Not authenticated')
        setActionLoading(false)
        return
      }
      const res = await fetch(`/api/admin/users/${userId}/badges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId, badge: badgeKey, awardedBy: session.user?.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setMessage('Badge awarded')
    } catch (err: any) {
      setMessage('Error: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Manage User</h1>
        {!isAuthenticated && <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded">⚠️ Not authenticated as admin</div>}
        {message && <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">{message}</div>}
        {session?.user?.id && <div className="text-xs text-gray-500 mb-2">Logged in as: {session.user.id}</div>}
        {profile ? (
          <div className="space-y-3">
            <p><strong>ID:</strong> {profile.id}</p>
            <p><strong>Email:</strong> {profile.email} {profile.email_verified ? '(verified)' : '(not verified)'}</p>
            <p><strong>Phone:</strong> {profile.phone || '—'} {profile.phone_verified ? '(verified)' : '(not verified)'}</p>
            <p><strong>Role:</strong> {profile.role}</p>
            <div className="flex gap-2">
              <Button onClick={() => doVerify({ email: true })} disabled={actionLoading}>Verify Email</Button>
              <Button onClick={() => doVerify({ phone: true })} disabled={actionLoading}>Verify Phone</Button>
              <Button onClick={() => doVerify({ contact: true })} disabled={actionLoading}>Mark Contact Revealed</Button>
            </div>
            <div className="pt-4">
              <label className="block text-sm mb-2">Award Badge (key)</label>
              <div className="flex gap-2">
                <Input value={badgeKey} onChange={(e) => setBadgeKey((e.target as HTMLInputElement).value)} />
                <Button onClick={doBadge} disabled={actionLoading || !badgeKey}>Award Badge</Button>
              </div>
            </div>
            <div className="pt-4">
              <Button variant="outline" onClick={() => router.push('/dashboard/admin')}>Back to Admin</Button>
            </div>
          </div>
        ) : (
          <div>No profile data</div>
        )}
      </Card>
    </div>
  )
}
