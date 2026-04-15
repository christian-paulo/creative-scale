// ─── Database Types ────────────────────────────────────────────────────────

export interface Workspace {
  id: string
  user_id: string
  name: string
  mercado: string | null
  volume_mensal: string | null
  plataformas: string[]
  data_source: 'utmify' | 'platform' | 'manual' | null
  utmify_api_key: string | null
  utmify_connected: boolean
  onboarding_done: boolean
  created_at: string
  updated_at: string
}

export interface NomenclatureRule {
  id: string
  workspace_id: string
  level: 'campaign' | 'adset' | 'ad'
  template: string[]
  separator: string
  created_at: string
  updated_at: string
}

export interface ElementSigla {
  id: string
  workspace_id: string
  sigla: string
  tipo: 'criativo' | 'hook' | 'vsl' | 'funil' | 'upsell' | 'pagina' | 'outro'
  created_at: string
}

export interface StageIdentifier {
  id: string
  workspace_id: string
  stage: 'teste' | 'pre_escala' | 'escala'
  identifiers: string[]
  created_at: string
}

export interface Benchmark {
  id: string
  workspace_id: string
  ticket_medio: number
  cpa_saudavel: number
  roas_minimo: number
  icr_saudavel: number
  ctr_saudavel: number
  created_at: string
  updated_at: string
}

export interface Element {
  id: string
  workspace_id: string
  nome: string
  tipo: 'criativo' | 'hook' | 'vsl' | 'funil' | 'upsell' | 'pagina' | 'outro'
  tags: string[]
  status: 'ativo' | 'pausado' | 'descartado'
  roas_historico: number | null
  cpa_historico: number | null
  vendas_total: number | null
  gasto_total: number | null
  receita_total: number | null
  melhor_combinacao: string | null
  timeline: TimelineEvent[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TimelineEvent {
  id: string
  data: string
  tipo: string
  titulo: string
  descricao: string
  metricas: Record<string, number>
  licoes: string[]
}

export interface Analysis {
  id: string
  workspace_id: string
  titulo: string
  nivel: 'campanha' | 'conjunto' | 'anuncio' | '360'
  foco: string[]
  tipo: 'individual' | 'ab' | 'escala' | 'padroes' | 'veredicto' | '360'
  stage: 'teste' | 'pre_escala' | 'escala' | 'todos'
  periodo_inicio: string
  periodo_fim: string
  elementos_selecionados: string[]
  conteudo: string
  creditos_usados: number | null
  created_at: string
}

export interface Experiment {
  id: string
  workspace_id: string
  nome: string
  tipo: string
  objetivo: string
  variavel_isolada: string
  metrica_decisao: string
  vendas_minimas: number
  budget_por_elemento: number
  prazo_maximo: number
  produto: string | null
  etapa: string | null
  contexto: string | null
  status: 'pending' | 'monitoring' | 'concluded'
  veredicto: string | null
  variantes: ExperimentVariant[]
  created_at: string
  updated_at: string
}

export interface ExperimentVariant {
  letra: string
  nome: string
  tag_nomenclatura: string
  metricas: {
    roas?: number
    cpa?: number
    vendas?: number
    hook_rate?: number
    icr?: number
    conv_checkout?: number
    arpu?: number
  }
}

export interface Alert {
  id: string
  workspace_id: string
  tipo: 'sem_venda' | 'queda_roas' | 'frequencia_alta' | 'outro'
  severity: 'low' | 'medium' | 'high'
  titulo: string
  descricao: string
  campanha_id: string | null
  campanha_nome: string | null
  resolvido: boolean
  created_at: string
}

export interface UtmifyCache {
  id: string
  workspace_id: string
  cache_key: string
  data: Record<string, unknown>
  expires_at: string
  created_at: string
}

// ─── UTMify API Types ──────────────────────────────────────────────────────

export interface UtmifyOverview {
  revenue: number
  spend: number
  roas: number
  cpa: number
  conversions: number
  clicks: number
  impressions: number
  ctr: number
  cpm: number
}

export interface UtmifyCampaign {
  id: string
  campaign_name: string
  status: string
  spend: number
  revenue: number
  roas: number
  cpa: number
  conversions: number
  clicks: number
  impressions: number
  ctr: number
  cpm: number
}

export interface UtmifyAdset {
  id: string
  adset_name: string
  campaign_name: string
  status: string
  spend: number
  revenue: number
  roas: number
  cpa: number
  conversions: number
  clicks: number
  impressions: number
  ctr: number
  cpm: number
}

export interface UtmifyAd {
  id: string
  ad_name: string
  adset_name: string
  campaign_name: string
  status: string
  spend: number
  revenue: number
  roas: number
  cpa: number
  conversions: number
  clicks: number
  impressions: number
  ctr: number
  cpm: number
  hook_rate?: number
}

// ─── UI / App Types ────────────────────────────────────────────────────────

export interface DateRange {
  from: Date
  to: Date
}

export interface ParsedNomenclature {
  etapa?: string
  conta?: string
  audiencia?: string
  orcamento?: string
  checkout?: string
  produto?: string
  publico?: string
  variacao?: string
  lance?: string
  criativo?: string
  hook?: string
  iteracao?: string
  [key: string]: string | undefined
}
