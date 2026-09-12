/**
 * The Onramp design system barrel: every primitive, the mascot and the motion
 * springs. Screens should import from here rather than reaching into
 * `primitives/<Name>/<Name>` directly.
 */

export { Button } from './primitives/Button/Button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './primitives/Button/Button'

export { Icon } from './primitives/Icon/Icon'
export type { IconProps, IconName } from './primitives/Icon/Icon'

export { Chip } from './primitives/Chip/Chip'
export type { ChipProps, ChipSize } from './primitives/Chip/Chip'

export { SegmentedControl } from './primitives/SegmentedControl/SegmentedControl'
export type { SegmentedControlProps, SegmentedOption } from './primitives/SegmentedControl/SegmentedControl'

export { Textarea } from './primitives/Textarea/Textarea'
export type { TextareaProps } from './primitives/Textarea/Textarea'

export { Input } from './primitives/Input/Input'
export type { InputProps } from './primitives/Input/Input'

export { ChecklistItem } from './primitives/ChecklistItem/ChecklistItem'
export type { ChecklistItemProps } from './primitives/ChecklistItem/ChecklistItem'

export { Card, CardTitle } from './primitives/Card/Card'
export type { CardProps, CardTitleProps } from './primitives/Card/Card'

export { MonoLabel } from './primitives/MonoLabel/MonoLabel'
export type { MonoLabelProps, MonoLabelTone } from './primitives/MonoLabel/MonoLabel'

export { SurfaceBadge } from './primitives/SurfaceBadge/SurfaceBadge'
export type { SurfaceBadgeProps, SurfaceBadgeSize } from './primitives/SurfaceBadge/SurfaceBadge'

export { StatusDot } from './primitives/StatusDot/StatusDot'
export type { StatusDotProps, StatusDotTone } from './primitives/StatusDot/StatusDot'

export { PromptBlock } from './primitives/PromptBlock/PromptBlock'
export type { PromptBlockProps } from './primitives/PromptBlock/PromptBlock'

export { CopyButton } from './primitives/CopyButton/CopyButton'
export type { CopyButtonProps } from './primitives/CopyButton/CopyButton'

export { Toast } from './primitives/Toast/Toast'
export type { ToastProps } from './primitives/Toast/Toast'

export { Tooltip } from './primitives/Tooltip/Tooltip'
export type { TooltipProps } from './primitives/Tooltip/Tooltip'

export { Sheet } from './primitives/Sheet/Sheet'
export type { SheetProps } from './primitives/Sheet/Sheet'

export { BackButton } from './primitives/BackButton/BackButton'
export type { BackButtonProps } from './primitives/BackButton/BackButton'

export { ThumbBar } from './primitives/ThumbBar/ThumbBar'
export type { ThumbBarProps } from './primitives/ThumbBar/ThumbBar'

export { Glow } from './primitives/Glow/Glow'
export type { GlowProps, GlowVariant } from './primitives/Glow/Glow'
export { glowTint } from './primitives/Glow/glowTint'

export { Ticker } from './primitives/Ticker/Ticker'
export type { TickerProps } from './primitives/Ticker/Ticker'

export { NodePill } from './primitives/NodePill/NodePill'
export type { NodePillProps, NodePillKind } from './primitives/NodePill/NodePill'

export { Stars } from './primitives/Stars/Stars'
export type { StarsProps } from './primitives/Stars/Stars'

export { Heart } from './primitives/Heart/Heart'
export type { HeartProps } from './primitives/Heart/Heart'

export { ProgressPath } from './primitives/ProgressPath/ProgressPath'
export type { ProgressPathProps } from './primitives/ProgressPath/ProgressPath'

export { Testimonial } from './primitives/Testimonial/Testimonial'
export type { TestimonialProps } from './primitives/Testimonial/Testimonial'

export { Mascot } from './mascot/Mascot'
export type { MascotProps, MascotState } from './mascot/Mascot'

export { boop, settle, sheet, reducedFade, durations, easeSpring, motionSpec } from './motion'
export type { Spring } from './motion'
