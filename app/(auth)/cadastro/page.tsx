'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function CadastroPage() {
  const router = useRouter()
  const supabase = createClient()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('As senhas não conferem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: nome },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Create workspace for the new user
      const { error: wsError } = await supabase.from('workspaces').insert({
        user_id: data.user.id,
        name: nome || email.split('@')[0],
        onboarding_done: false,
        plataformas: [],
        utmify_connected: false,
      })

      if (wsError) {
        console.error('Workspace creation error:', wsError)
      }

      router.push('/onboarding')
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
          <h1 className="text-xl font-semibold text-slate-900 mb-6">Criar sua conta</h1>

          <form onSubmit={handleCadastro} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-sm font-medium text-slate-700">
                Nome
              </Label>
              <Input
                id="nome"
                type="text"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full"
              />
            </div>

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
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm font-medium text-slate-700">
                Confirmar senha
              </Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Repita a senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>

          <p className="text-sm text-slate-500 text-center mt-6">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-green-600 font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
