import { createFileRoute } from '@tanstack/react-router'
import { MonoLabel } from '@/design-system'
import { privacy, dataTable } from '@/content/privacy'
import s from './privacy.module.css'

function PrivacyPage() {
  return (
    <div className={s.page}>
      <MonoLabel as="span" className={s.eyebrow}>
        {privacy.eyebrow}
      </MonoLabel>
      <h1 className={s.h1}>{privacy.h1}</h1>
      <p className={s.statement}>{privacy.statement}</p>
      <p className={s.body}>{privacy.intro}</p>

      <h2 className={s.h2}>{privacy.tableHeading}</h2>
      <div className={s.tableWrap} tabIndex={0} role="region" aria-label={privacy.tableHeading}>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">Counter</th>
              <th scope="col">Keyed by</th>
              <th scope="col">Never stored</th>
            </tr>
          </thead>
          <tbody>
            {dataTable.map((row) => (
              <tr key={row.counter}>
                <td>{row.counter}</td>
                <td>{row.keyedBy}</td>
                <td>{row.neverStored}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={s.body}>{privacy.abuseControls}</p>
      <p className={s.body}>{privacy.totals}</p>
      <p className={s.body}>{privacy.usageLine}</p>
      <p className={s.body}>{privacy.rollup}</p>
      <p className={s.body}>{privacy.changes}</p>
    </div>
  )
}

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})
