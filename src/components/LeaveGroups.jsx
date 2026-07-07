const MAX_BY_ID = {
  annual: 30, sick: 60, personal: 30, maternity: 180, paternity: 30,
  compensation: 30, ordination: 60, unpaid: 365, sterilization: 30,
  training: 90, military: 365,
}

const hintFor = (t) => {
  if (t.id === 'annual') return 'อายุงาน 1–3 ปี: 7 / 3–5 ปี: 10 / >5 ปี: 15 · ส่วนที่ไม่ได้ใช้สะสมข้ามปี (สูงสุด 20) ส่วนเกินจ่ายคืนเป็นเงิน'
  if (t.id === 'compensation') return 'ขึ้นกับวันที่ทำงานวันหยุด'
  if (t.minTenureYears) return `ใช้สิทธิเมื่ออายุงาน ≥ ${t.minTenureYears} ปี`
  return null
}

export default function LeaveGroups({
  sections,
  typeById,
  selectedUserEnt,
  editing,
  draft,
  setDraft,
  carryDraft,
  setCarryDraft,
  baseDraft,
  setBaseDraft,
  defaults,
  selectedEnt,
  usedFor,
}) {
  return (
    <div className="le-groups">
      {sections.map((g) => {
        const groupTypes = g.types.map((id) => typeById[id]).filter(Boolean)
        if (groupTypes.length === 0) return null
        return (
          <section key={g.id} className="le-group">
            <header className="le-group-head">
              <span className="le-group-icon">{g.icon}</span>
              <h3>{g.label}</h3>
              <span className="le-group-count">{groupTypes.length} ประเภท</span>
            </header>
            <div className="le-group-grid">
              {groupTypes.map((t) => {
                const isAnnual = t.id === 'annual'
                const annualBase = Number(selectedUserEnt._annualBase) || 0
                const storedCarry = Number(selectedUserEnt._annualCarryOver) || 0
                const liveBase = editing && isAnnual ? baseDraft : annualBase
                const liveCarry = editing && isAnnual ? carryDraft : storedCarry
                const value = isAnnual
                  ? (liveBase + liveCarry)
                  : (editing ? (draft[t.id] ?? defaults[t.id]) : selectedEnt[t.id])
                const isComputed = t.quota === null
                const used = usedFor(t)
                const remaining = (Number(value) || 0) - used
                const max = MAX_BY_ID[t.id] ?? 365
                return (
                  <div key={t.id} className={`le-tile ${isComputed ? 'is-computed' : ''}`}>
                    <p className="le-tile-label">{t.labelTh}</p>

                    {editing && !isAnnual ? (
                      <div className="le-tile-input-row">
                        <input
                          type="number"
                          min={-365}
                          max={max}
                          step={0.5}
                          value={value}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [t.id]: Number(e.target.value) }))
                          }
                          className="le-tile-input"
                        />
                        <span className="le-tile-unit">วัน/ปี</span>
                      </div>
                    ) : (
                      <p className="le-tile-value">
                        {value} <span>วัน{isAnnual ? '/ปี' : ''}</span>
                      </p>
                    )}

                    {isAnnual && (
                      <p className="le-tile-breakdown">
                        ฐาน{' '}
                        {editing ? (
                          <input
                            type="number"
                            min={0}
                            max={30}
                            step={0.5}
                            value={baseDraft}
                            onChange={(e) => {
                              const v = Math.max(0, Math.min(30, Number(e.target.value) || 0))
                              setBaseDraft(v)
                              setDraft((d) => ({ ...d, annual: v + carryDraft }))
                            }}
                            className="le-tile-carry-input"
                            title="วันลาพักร้อนฐาน"
                          />
                        ) : (
                          <strong>{annualBase}</strong>
                        )}
                        {' '}+ สะสม{' '}
                        {editing ? (
                          <input
                            type="number"
                            min={0}
                            max={20}
                            step={0.5}
                            value={carryDraft}
                            onChange={(e) => {
                              const v = Math.max(0, Math.min(20, Number(e.target.value) || 0))
                              setCarryDraft(v)
                              setDraft((d) => ({ ...d, annual: baseDraft + v }))
                            }}
                            className="le-tile-carry-input"
                            title="ยอดสะสมจากปีก่อน (สูงสุด 20 วัน)"
                          />
                        ) : (
                          <strong className="le-tile-breakdown-carry">{storedCarry}</strong>
                        )}
                        {' '}วัน
                      </p>
                    )}

                    {editing && !isAnnual ? (
                      <p className="le-tile-usage">
                        ใช้ <strong>{used}</strong> · คงเหลือ{' '}
                        <input
                          type="number"
                          min={-365}
                          max={max}
                          step={0.5}
                          value={remaining}
                          onChange={(e) => {
                            const r = Number(e.target.value) || 0
                            setDraft((d) => ({ ...d, [t.id]: r + used }))
                          }}
                          className="le-tile-remaining-input"
                          title="แก้ไขวันคงเหลือ — quota จะปรับเป็น คงเหลือ + ใช้ไป"
                        />{' '}
                        วัน
                      </p>
                    ) : (
                      <p className="le-tile-usage">
                        ใช้ <strong>{used}</strong> · คงเหลือ{' '}
                        <strong className="le-tile-usage-remaining">{remaining}</strong> วัน
                      </p>
                    )}

                    {hintFor(t) && <p className="le-tile-hint">{hintFor(t)}</p>}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
