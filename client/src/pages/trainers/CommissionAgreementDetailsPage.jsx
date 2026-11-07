import { ArrowLeft, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../components/common/Badge.jsx'
import { Button } from '../../components/common/Button.jsx'
import { Card } from '../../components/common/Card.jsx'
import { LoadingScreen } from '../../components/common/LoadingScreen.jsx'
import { getCommissionAgreement } from '../../services/commissionAgreementApi.js'
import { getApiErrorMessage } from '../../utils/apiError.js'
import {
  formatAgreementDate,
  getCommissionBasisLabel,
} from '../../utils/commissionAgreementFormat.js'

export function CommissionAgreementDetailsPage() {
  const { agreementId } = useParams()
  const [agreement, setAgreement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getCommissionAgreement(agreementId, { signal: controller.signal })
      .then(setAgreement)
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError, 'Could not load this agreement.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [agreementId])

  if (loading) return <LoadingScreen label="Loading commission agreement" />
  if (!agreement) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <p className="text-sm text-danger" role="alert">{error || 'Commission agreement not found'}</p>
        <Button as={Link} className="mt-4" to="/trainers" variant="secondary">Back to trainers</Button>
      </div>
    )
  }

  const trainer = agreement.trainer
  const trainerName = `${trainer.firstName} ${trainer.lastName}`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
          to={`/trainers/${trainer._id}`}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {trainerName}
        </Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Agreement version {agreement.agreementVersion}</h2>
            <p className="mt-2 text-sm text-text-secondary">{trainer.trainerCode}</p>
          </div>
          <Button as={Link} to={`/trainers/${trainer._id}/commission-agreements/new`} variant="secondary">
            <Plus aria-hidden="true" className="size-4" />
            Add version
          </Button>
        </div>
      </div>
      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Recorded agreement terms</h3>
          <Badge variant="info">{getCommissionBasisLabel(agreement.commissionBasis)}</Badge>
        </div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-text-muted">Trainer</dt>
            <dd className="mt-1 text-sm text-text-primary">{trainerName}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Version</dt>
            <dd className="mt-1 text-sm text-text-primary">{agreement.agreementVersion}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Effective from</dt>
            <dd className="mt-1 text-sm text-text-primary">{formatAgreementDate(agreement.effectiveFrom)}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Effective to</dt>
            <dd className="mt-1 text-sm text-text-primary">{formatAgreementDate(agreement.effectiveTo)}</dd>
          </div>
        </dl>
        <p className="mt-6 border-t border-border pt-4 text-sm text-text-secondary">
          Agreement versions are preserved as recorded. Commission rates, formulas, and calculations are not part of this phase.
        </p>
      </Card>
    </div>
  )
}
