import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/common/Button.jsx'
import { LoadingScreen } from '../../components/common/LoadingScreen.jsx'
import { MembershipPlanForm } from '../../components/memberships/MembershipPlanForm.jsx'
import {
  createMembershipPlan,
  getMembershipPlan,
  updateMembershipPlan,
} from '../../services/membershipApi.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

function getValidationErrors(error) {
  return Object.fromEntries(
    (error.response?.data?.errors ?? []).map(({ field, message }) => [field, message]),
  )
}

export function MembershipPlanFormPage() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(Boolean(planId))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    if (!planId) {
      return undefined
    }
    const controller = new AbortController()
    getMembershipPlan(planId, { signal: controller.signal })
      .then(setPlan)
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError, 'Could not load this plan.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [planId])

  async function handleSubmit(values) {
    setSubmitting(true)
    setError('')
    setValidationErrors({})
    try {
      if (!Number.isSafeInteger(values.pricePaise) || values.pricePaise < 0) {
        setValidationErrors({ pricePaise: 'Enter a valid INR amount with up to two decimals.' })
        return
      }
      const saved = planId
        ? await updateMembershipPlan(planId, values)
        : await createMembershipPlan(values)
      navigate('/membership-plans', { replace: true })
      return saved
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not save this plan.'))
      setValidationErrors(getValidationErrors(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading membership plan" />
  }

  if (planId && error && !plan) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <p className="text-sm text-danger" role="alert">{error}</p>
        <Button as={Link} className="mt-4" to="/membership-plans" variant="secondary">Back to plans</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary" to="/membership-plans">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Membership plans
        </Link>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          {planId ? 'Edit membership plan' : 'Create membership plan'}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Existing memberships keep a snapshot of their original plan and price.
        </p>
      </div>
      {error && <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      <MembershipPlanForm
        errors={validationErrors}
        onCancel={() => navigate('/membership-plans')}
        onSubmit={handleSubmit}
        plan={plan}
        submitting={submitting}
      />
    </div>
  )
}
