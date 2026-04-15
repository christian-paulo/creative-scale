import type { ParsedNomenclature, NomenclatureRule, ElementSigla, StageIdentifier } from '@/types'

export function parseNomenclature(
  adName: string,
  campaignName: string,
  rules: NomenclatureRule[],
  siglas: ElementSigla[],
  stages: StageIdentifier[]
): ParsedNomenclature {
  const result: ParsedNomenclature = {}

  // Parse campaign name using campaign rules
  const campaignRule = rules.find((r) => r.level === 'campaign')
  if (campaignRule && campaignName) {
    const parts = campaignName.split(campaignRule.separator)
    campaignRule.template.forEach((field, idx) => {
      if (parts[idx]) {
        result[field] = parts[idx].replace(/[\[\]]/g, '').trim()
      }
    })
  }

  // Identify stage from campaign name
  if (campaignName) {
    for (const stageId of stages) {
      for (const identifier of stageId.identifiers) {
        if (campaignName.toUpperCase().includes(identifier.toUpperCase())) {
          result.etapa = stageId.stage
          break
        }
      }
      if (result.etapa) break
    }
  }

  // Parse ad name using ad rules + siglas
  const adRule = rules.find((r) => r.level === 'ad')
  if (adRule && adName) {
    // Try to match by sigla prefix
    for (const sigla of siglas) {
      const regex = new RegExp(`${sigla.sigla}([\\w-]+)`, 'i')
      const match = adName.match(regex)
      if (match) {
        result[sigla.tipo] = match[0]
      }
    }

    // Also try template-based parsing
    const separator = adRule.separator || '-'
    const parts = adName.split(separator)
    adRule.template.forEach((field, idx) => {
      if (parts[idx] && !result[field]) {
        result[field] = parts[idx].trim()
      }
    })
  }

  return result
}

export function buildNomenclaturePreview(
  template: string[],
  separator: string,
  values?: Record<string, string>
): string {
  return template
    .map((field) => (values?.[field] ? `[${values[field]}]` : `[${field.toUpperCase()}]`))
    .join(separator)
}

export const CAMPAIGN_BLOCKS = [
  'etapa',
  'conta',
  'audiencia',
  'orcamento',
  'checkout',
  'produto',
]

export const ADSET_BLOCKS = ['publico', 'variacao', 'lance']

export const AD_BLOCKS = ['criativo', 'hook', 'iteracao']

export const NOMENCLATURE_TEMPLATES = [
  {
    id: 'template_1',
    nome: 'Padrão Direct Response',
    campanha: ['etapa', 'conta', 'audiencia', 'orcamento', 'checkout'],
    conjunto: ['publico', 'variacao'],
    anuncio: ['criativo', 'hook'],
    separator: '-',
  },
  {
    id: 'template_2',
    nome: 'Simplificado',
    campanha: ['etapa', 'produto', 'conta'],
    conjunto: ['publico'],
    anuncio: ['criativo', 'iteracao'],
    separator: '_',
  },
  {
    id: 'template_3',
    nome: 'Avançado com Checkout',
    campanha: ['etapa', 'conta', 'audiencia', 'orcamento', 'checkout', 'produto'],
    conjunto: ['publico', 'variacao', 'lance'],
    anuncio: ['criativo', 'hook', 'iteracao'],
    separator: '-',
  },
]
