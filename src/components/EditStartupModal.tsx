'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Startup, Sector } from '@/lib/types'

const SECTOR_OPTIONS = [
  'Fintech', 'SaaS', 'HealthTech', 'Health', 'MedTech', 'BioTech',
  'FoodTech', 'Food', 'AgriTech', 'RetailTech', 'Retail', 'E-commerce',
  'CleanTech', 'GreenTech', 'EdTech', 'PropTech', 'LegalTech', 'HRTech',
  'Logistics', 'Mobility', 'AI / ML', 'Cybersecurity', 'DeepTech',
  'Consumer', 'B2B SaaS', 'Marketplace', 'Impact', 'Other',
]

function mapSector(raw: string): Sector {
  const s = (raw || '').toLowerCase()
  if (s.includes('health') || s.includes('medical') || s.includes('care') || s.includes('medtech') || s.includes('biotech')) return 'Health'
  if (s.includes('food') || s.includes('beverage') || s.includes('agri') || s.includes('nutrition')) return 'Food'
  if (s.includes('retail') || s.includes('fashion') || s.includes('ecommerce') || s.includes('e-commerce') || s.includes('consumer')) return 'Retail'
  return 'General'
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="col-span-2 border-t border-gray-100 pt-4 mt-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

interface Props {
  startup: Startup
  onClose: () => void
}

export default function EditStartupModal({ startup, onClose }: Props) {
  const router = useRouter()

  const initialSectorRaw = startup.sector_raw ?? ''
  const isKnownSector = SECTOR_OPTIONS.includes(initialSectorRaw)

  const [form, setForm] = useState({
    name:                        startup.name ?? '',
    one_liner:                   startup.one_liner ?? '',
    pitch_deck_url:              startup.pitch_deck_url ?? '',
    website:                     startup.website ?? '',
    location:                    startup.location ?? '',
    founding_date:               startup.founding_date ?? '',
    contact_name:                startup.contact_name ?? '',
    contact_email:               startup.contact_email ?? '',
    contact_phone:               startup.contact_phone ?? '',
    business_model_description:  startup.business_model_description ?? '',
    stage:                       startup.stage ?? '',
    funding_raised:              startup.funding_raised ?? '',
    mrr:                         startup.mrr ?? '',
    funding_target:              startup.funding_target ?? '',
    amount_committed:            startup.amount_committed ?? '',
    round_type:                  startup.round_type ?? '',
    traction:                    startup.traction ?? '',
    impact:                      startup.impact ?? '',
    how_heard:                   startup.how_heard ?? '',
    sector_raw_list:             isKnownSector ? initialSectorRaw : '',
  })
  const [customSector, setCustomSector] = useState(isKnownSector ? '' : initialSectorRaw)
  const [sectorMode, setSectorMode] = useState<'list' | 'custom'>(isKnownSector || !initialSectorRaw ? 'list' : 'custom')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const effectiveSectorRaw = sectorMode === 'custom' ? customSector : form.sector_raw_list

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      name:                       form.name,
      one_liner:                  form.one_liner,
      sector_raw:                 effectiveSectorRaw || null,
      sector:                     effectiveSectorRaw ? mapSector(effectiveSectorRaw) : startup.sector,
      pitch_deck_url:             form.pitch_deck_url,
      website:                    form.website,
      location:                   form.location,
      founding_date:              form.founding_date,
      contact_name:               form.contact_name,
      contact_email:              form.contact_email,
      contact_phone:              form.contact_phone,
      business_model_description: form.business_model_description,
      stage:                      form.stage,
      funding_raised:             form.funding_raised,
      mrr:                        form.mrr,
      funding_target:             form.funding_target,
      amount_committed:           form.amount_committed,
      round_type:                 form.round_type,
      traction:                   form.traction,
      impact:                     form.impact,
      how_heard:                  form.how_heard,
    }

    const res = await fetch(`/api/admin/startups/${startup.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Er ging iets mis')
      setLoading(false)
      return
    }

    router.refresh()
    onClose()
  }

  const inp = (key: keyof typeof form, placeholder?: string, type = 'text') => (
    <input
      className="input"
      type={type}
      value={form[key]}
      onChange={e => set(key, e.target.value)}
      placeholder={placeholder}
    />
  )

  const textarea = (key: keyof typeof form, placeholder?: string, rows = 4) => (
    <textarea
      className="input resize-none"
      rows={rows}
      value={form[key]}
      onChange={e => set(key, e.target.value)}
      placeholder={placeholder}
    />
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Startup bewerken</h2>
            <p className="text-sm text-gray-400 mt-0.5">{startup.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form id="edit-startup-form" onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 flex-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">

            <SectionHeader title="Bedrijfsinfo" />

            <Field label="Bedrijfsnaam" required>
              <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} />
            </Field>

            <Field label="Sector">
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <select
                    className={`input flex-1 ${sectorMode === 'custom' ? 'opacity-40' : ''}`}
                    disabled={sectorMode === 'custom'}
                    value={form.sector_raw_list}
                    onChange={e => { setSectorMode('list'); set('sector_raw_list', e.target.value) }}
                  >
                    <option value="">Kies sector…</option>
                    {SECTOR_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setSectorMode(m => m === 'custom' ? 'list' : 'custom')}
                    className={`shrink-0 px-2.5 rounded-lg border text-xs font-medium transition-colors ${sectorMode === 'custom' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    Vrij
                  </button>
                </div>
                {sectorMode === 'custom' && (
                  <input
                    className="input"
                    autoFocus
                    value={customSector}
                    onChange={e => setCustomSector(e.target.value)}
                    placeholder="bijv. CleanTech"
                  />
                )}
                {effectiveSectorRaw && (
                  <p className="text-xs text-gray-400">
                    Mapped als: <span className="font-medium text-gray-600">{mapSector(effectiveSectorRaw)}</span>
                  </p>
                )}
              </div>
            </Field>

            <div className="col-span-2">
              <Field label="Omschrijving">
                {textarea('one_liner', 'Korte omschrijving van het bedrijf', 3)}
              </Field>
            </div>

            <Field label="Website">{inp('website', 'https://…')}</Field>
            <Field label="Locatie">{inp('location', 'bijv. Amsterdam')}</Field>
            <Field label="Oprichtingsdatum">{inp('founding_date', 'bijv. 2023-01-15')}</Field>
            <Field label="Pitch deck URL">{inp('pitch_deck_url', 'https://…')}</Field>

            <SectionHeader title="Contactpersoon" />

            <Field label="Naam">{inp('contact_name')}</Field>
            <Field label="E-mail">{inp('contact_email', '', 'email')}</Field>
            <Field label="Telefoon">{inp('contact_phone')}</Field>

            <SectionHeader title="Business" />

            <div className="col-span-2">
              <Field label="Business model">
                {textarea('business_model_description', 'Hoe verdient het bedrijf geld?')}
              </Field>
            </div>

            <Field label="Stage">
              <select className="input" value={form.stage} onChange={e => set('stage', e.target.value)}>
                <option value="">— selecteer —</option>
                <option>Pre-idea</option>
                <option>Pre-seed</option>
                <option>Seed</option>
                <option>Series A</option>
                <option>Series B</option>
                <option>Series C+</option>
                <option>Growth</option>
              </select>
            </Field>

            <Field label="Type ronde">
              <select className="input" value={form.round_type} onChange={e => set('round_type', e.target.value)}>
                <option value="">— selecteer —</option>
                <option>Equity</option>
                <option>Convertible</option>
                <option>SAFE</option>
                <option>Non-dilutive</option>
                <option>Other</option>
              </select>
            </Field>

            <SectionHeader title="Financiën (EUR)" />

            <Field label="Funding raised">{inp('funding_raised', '0')}</Field>
            <Field label="MRR">{inp('mrr', '0')}</Field>
            <Field label="Funding target">{inp('funding_target', '500000')}</Field>
            <Field label="Amount committed">{inp('amount_committed', '0')}</Field>

            <SectionHeader title="Overig" />

            <div className="col-span-2">
              <Field label="Traction highlights">
                {textarea('traction', 'Klanten, omzet, gebruikers…')}
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Impact">
                {textarea('impact', 'Hoe draagt het bedrijf bij aan een inclusievere/duurzamere wereld?')}
              </Field>
            </div>
            <Field label="Hoe gehoord van AtVenture?">{inp('how_heard')}</Field>

          </div>

          {error && (
            <p className="mt-4 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Annuleren
          </button>
          <button
            type="submit"
            form="edit-startup-form"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}
