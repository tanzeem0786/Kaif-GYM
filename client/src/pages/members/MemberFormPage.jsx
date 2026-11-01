import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/common/Button.jsx'
import { LoadingScreen } from '../../components/common/LoadingScreen.jsx'
import { MemberForm } from '../../components/members/MemberForm.jsx'
import { createMember, getMember, updateMember } from '../../services/memberApi.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

function getValidationErrors(error) {
  return Object.fromEntries(
    (error.response?.data?.errors ?? []).map(({ field, message }) => [
      field.split('.')[0],
      message,
    ]),
  )
}

export function MemberFormPage() {
  const { memberId } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(Boolean(memberId))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    if (!memberId) {
      return undefined
    }

    const controller = new AbortController()
    getMember(memberId, { signal: controller.signal })
      .then(setMember)
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError, 'Could not load this member.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [memberId])

  async function handleSubmit(values) {
    setSubmitting(true)
    setError('')
    setValidationErrors({})
    try {
      const saved = memberId
        ? await updateMember(memberId, values)
        : await createMember(values)
      navigate(`/members/${saved._id}`, { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not save this member.'))
      setValidationErrors(getValidationErrors(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading member details" />
  }

  if (memberId && error && !member) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
        <Button as={Link} className="mt-4" to="/members" variant="secondary">
          Back to members
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
          to={memberId ? `/members/${memberId}` : '/members'}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {memberId ? 'Member details' : 'Members'}
        </Link>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          {memberId ? 'Edit member' : 'Add a member'}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Member profiles are for admin management only. No member login account is created.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3" role="alert">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
      <MemberForm
        errors={validationErrors}
        member={member}
        onCancel={() => navigate(memberId ? `/members/${memberId}` : '/members')}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  )
}
