import { createFileRoute, Link } from '@tanstack/react-router'
import { MonoLabel } from '@/design-system'
import { about } from '@/content/about'
import s from './about.module.css'

function AboutPage() {
  return (
    <div className={s.page}>
      <MonoLabel as="span" className={s.eyebrow}>
        {about.eyebrow}
      </MonoLabel>
      <h1 className={s.h1}>{about.h1}</h1>
      <p className={s.tagline}>{about.tagline}</p>
      <p className={s.disclaimer}>{about.disclaimer}</p>
      <p className={s.body}>{about.whatItIs}</p>
      <p className={s.body}>
        {about.howBuiltIntro} <Link to={about.howBuiltHref}>{about.howBuiltLinkLabel}</Link>.
      </p>
      <p className={s.body}>
        <a href={about.repo.href} target="_blank" rel="noopener noreferrer">
          {about.repo.label}
        </a>
      </p>

      <h2 className={s.h2}>{about.licences.heading}</h2>
      <p className={s.body}>{about.licences.code}</p>
      <p className={s.body}>{about.licences.catalogue}</p>

      <h2 className={s.h2}>{about.licences.attributionsHeading}</h2>
      <ul className={s.attributions}>
        {about.licences.attributions.map((item) => (
          <li key={item.name}>
            <strong>{item.name}</strong> ({item.licence}): {item.note}.
          </li>
        ))}
      </ul>
      <p className={s.body}>
        {about.designSystemNote}
        <Link to={about.designSystemHref}>{about.designSystemLinkLabel}</Link>.
      </p>
    </div>
  )
}

export const Route = createFileRoute('/about')({
  component: AboutPage,
})
