import { ServiceDetailClient } from './ServiceDetailClient'

interface Props { params: { id: string } }

export default function ServiceDetailPage({ params }: Props) {
  return <ServiceDetailClient id={params.id} />
}
