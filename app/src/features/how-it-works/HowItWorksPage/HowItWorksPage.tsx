/**
 * /how-it-works (designer brief section 6, developer brief section 11,
 * BUILD_CONTRACT package F). The credibility page: shows the machine
 * running, prints no recipe.
 */
import { MonoLabel } from '@/design-system'
import { how } from '@/content/how'
import { MapLiveBlock } from '../MapLiveBlock/MapLiveBlock'
import { MatcherDemoBlock } from '../MatcherDemoBlock/MatcherDemoBlock'
import { PipelineBlock } from '../PipelineBlock/PipelineBlock'
import { RouteAssemblyBlock } from '../RouteAssemblyBlock/RouteAssemblyBlock'
import { NeverStoreBlock } from '../NeverStoreBlock/NeverStoreBlock'
import { ProofStrip } from '../ProofStrip/ProofStrip'
import { OpenSourceCard } from '../OpenSourceCard/OpenSourceCard'
import s from './HowItWorksPage.module.css'

export function HowItWorksPage() {
  return (
    <div className={s.page}>
      <MonoLabel as="span" size={10}>
        {how.eyebrow}
      </MonoLabel>
      <h1 className={s.h1}>{how.h1}</h1>
      <p className={s.intro}>{how.intro}</p>

      <div className={s.row}>
        <MapLiveBlock />
        <MatcherDemoBlock />
      </div>

      <PipelineBlock className={s.fullWidthBlock} />

      <div className={s.row}>
        <RouteAssemblyBlock />
        <NeverStoreBlock />
      </div>

      <ProofStrip />
      <OpenSourceCard />
    </div>
  )
}
