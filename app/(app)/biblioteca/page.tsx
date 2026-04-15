'use client'

import { TopBar } from '@/components/layout/TopBar'
import { BookMarked } from 'lucide-react'

export default function BibliotecaPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar showDatePicker={false} />

      <main className="flex-1 p-5 overflow-y-auto">
        <div className="mb-5">
          <h1 className="text-[17px] font-bold text-slate-900">Biblioteca</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">Inteligência acumulada da operação</p>
        </div>

        <div className="text-center py-16">
          <BookMarked className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Biblioteca em construção.</p>
          <p className="text-xs text-slate-400 mt-1">
            Aqui ficará o acervo de aprendizados, padrões e hipóteses geradas pelas análises.
          </p>
        </div>
      </main>
    </div>
  )
}
