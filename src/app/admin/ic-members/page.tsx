import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { IcMember } from '@/lib/types'

export const dynamic = 'force-dynamic'

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  PreScreen:  { label: 'Pre-screen (Deal Lead)', className: 'bg-purple-100 text-purple-700' },
  All:        { label: 'All sectors',            className: 'bg-blue-100 text-blue-700' },
  Health:     { label: 'Health',                 className: 'bg-teal-100 text-teal-700' },
  Retail:     { label: 'Retail',                 className: 'bg-orange-100 text-orange-700' },
  Food:       { label: 'Food',                   className: 'bg-green-100 text-green-700' },
  General:    { label: 'General',                className: 'bg-gray-100 text-gray-700' },
}

export default async function IcMembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.email !== (process.env.ADMIN_EMAIL ?? '').trim()) redirect('/review')

  const adminClient = createAdminClient()
  const { data: members = [] } = await adminClient
    .from('ic_members')
    .select('*')
    .order('name') as { data: IcMember[] | null }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-brand-dark shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/admin" className="text-white/60 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="w-px h-5 bg-white/20" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
              <span className="text-accent font-bold text-xs">A</span>
            </div>
            <span className="text-white font-semibold text-sm">AtVenture</span>
            <span className="text-white/40 text-xs ml-1">IC Members</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">IC Members</h1>
          <p className="text-gray-500 mt-1">{members?.length ?? 0} members — roles and access levels</p>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role / Sector</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Access level</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Linked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(members ?? []).map((m) => {
                const role = ROLE_CONFIG[m.ic_type] ?? ROLE_CONFIG.General
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{m.name}</td>
                    <td className="px-4 py-3 text-gray-500">{m.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${role.className}`}>
                        {role.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {m.ic_type === 'PreScreen'
                        ? 'Full gating + scoring (all sectors)'
                        : m.ic_type === 'All'
                        ? 'No Harm check + scoring (all sectors)'
                        : `No Harm check + scoring (${m.ic_type} sector only)`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.auth_user_id
                        ? <span className="text-green-600 text-xs font-medium">✓ Active</span>
                        : <span className="text-gray-400 text-xs">Not logged in yet</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          To change a member&apos;s role, update their <code>ic_type</code> in Supabase → Table Editor → ic_members.
          Set to <strong>PreScreen</strong> for deal leads (Laurie, Tessa) who see the full gating form.
        </p>
      </div>
    </div>
  )
}
