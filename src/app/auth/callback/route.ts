import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cookieStore.set(name, value, options as any)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const user = data.user
  const adminClient = createAdminClient()

  // Link the Supabase auth user to their ic_member record (first login only)
  const { data: member } = await adminClient
    .from('ic_members')
    .select('id, auth_user_id')
    .eq('email', user.email!)
    .maybeSingle()

  if (member && !member.auth_user_id) {
    await adminClient
      .from('ic_members')
      .update({ auth_user_id: user.id })
      .eq('id', member.id)
  }

  // Redirect admin to /admin, all others to /review
  const isAdmin = user.email === process.env.ADMIN_EMAIL
  return NextResponse.redirect(`${origin}${isAdmin ? '/admin' : '/review'}`)
}
