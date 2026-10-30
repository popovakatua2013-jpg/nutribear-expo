// Иконка ёмкости по названию (перенос vesselIcons из веб-версии)
import { Amphora, Coffee, Droplets, GlassWater, Milk } from 'lucide-react-native'

export function vesselIcon(label) {
  const l = String(label || '').toLowerCase()
  if (l.includes('стакан') || l.includes('рюмк') || l.includes('чарк')) return GlassWater
  if (l.includes('кружк') || l.includes('чаш') || l.includes('тайи')) return Coffee
  if (l.includes('бутыл') || l.includes('фляг') || l.includes('термос')) return Milk
  if (l.includes('кувшин') || l.includes('бан') || l.includes('графин')) return Amphora
  return Droplets
}
