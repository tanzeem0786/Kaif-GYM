import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/common/Button.jsx'
import { Card } from '../../components/common/Card.jsx'
import { TextField } from '../../components/common/TextField.jsx'
import { LoadingScreen } from '../../components/common/LoadingScreen.jsx'
import { createTrainerCommissionAgreement } from '../../services/commissionAgreementApi.js'
import { getTrainer } from '../../services/trainerApi.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

function getValidationErrors(error) {
  return Object.fromEntries(
    (error.response?.data?.errors ?? []).map(({ field, message }) => [field, message]),
  )
}

export function CommissionAgreementFormPage() {
  const { trainerId } = useParams()
  const navigate = useNavigate()
  const [trainer, setTrainer] = useState(null)
  const [values, setValues] = useState({
    commissionBasis: '',
    effectiveFrom: '',
    effectiveTo: '',
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    const controller = new AbortController()
    getTrainer(trainerId, { signal: controller.signal })
      .then(setTrainer)
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError, 'Could not load this trainer.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [trainerId])

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setValidationErrors({})
    try {
      const agreement = await createTrainerCommissionAgreement(trainerId, {
        commissionBasis: values.commissionBasis,
        effectiveFrom: values.effectiveFrom,
        effectiveTo: values.effectiveTo || null,
      })
      navigate(`/commission-agreements/${agreement._id}`, { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not create this agreement version.'))
      setValidationErrors(getValidationErrors(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingScreen label="Loading trainer" />
  if (!trainer) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <p className="text-sm text-danger" role="alert">{error || 'Trainer not found'}</p>
        <Button as={Link} className="mt-4" to="/trainers" variant="secondary">Back to trainers</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
          to={`/trainers/${trainerId}`}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {trainer.firstName} {trainer.lastName}
        </Link>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">Add agreement version</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Each submission creates a new immutable version for this trainer.
        </p>
      </div>
      {error && <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      <Card className="p-5 sm:p-7">
        <form className="space-y-5" noValidate onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm font-medium text-text-primary" htmlFor="commission-basis">
            <span>Commission basis</span>
            <select
              aria-invalid={Boolean(validationErrors.commissionBasis)}
              className="min-h-12 w-full rounded-xl border border-border bg-bg px-4 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30"
              id="commission-basis"
              onChange={(event) => update('commissionBasis', event.target.value)}
              required
              value={values.commissionBasis}
            >
              <option value="" disabled>Select a basis</option>
              <option value="membership_fee">Membership Fee</option>
              <option value="received_payment">Received Payment</option>
            </select>
            {validationErrors.commissionBasis && <span className="block text-danger">{validationErrors.commissionBasis}</span>}
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              error={validationErrors.effectiveFrom}
              id="effective-from"
              label="Effective from"
              onChange={(event) => update('effectiveFrom', event.target.value)}
              required
              type="date"
              value={values.effectiveFrom}
            />
            <TextField
              error={validationErrors.effectiveTo}
              hint="Leave blank if no end date has been agreed."
              id="effective-to"
              label="Effective to (optional)"
              onChange={(event) => update('effectiveTo', event.target.value)}
              type="date"
              value={values.effectiveTo}
            />
          </div>
          <div className="rounded-xl border border-info/20 bg-info/10 p-4 text-sm text-text-secondary">
            This phase records only the approved basis and effective dates. Rate, custom-unit,
            formula, and calculation timing fields are intentionally not included pending approval.
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button as={Link} to={`/trainers/${trainerId}`} variant="secondary">Cancel</Button>
            <Button loading={submitting} type="submit">Create version</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
