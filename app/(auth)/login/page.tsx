'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou senha inválidos.')
      setLoading(false)
      return
    }

    // Check onboarding status
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('onboarding_done')
        .eq('user_id', user.id)
        .single()

      if (workspace && !workspace.onboarding_done) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-green-600 tracking-tight">claudio</span>
          <p className="text-sm text-slate-500 mt-2">Inteligência de campanha 360°</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <h1 className="text-xl font-semibold text-slate-900 mb-6">Entrar na sua conta</h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-sm text-slate-500 text-center mt-6">
            Não tem uma conta?{' '}
            <Link href="/cadastro" className="text-green-600 font-medium hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
