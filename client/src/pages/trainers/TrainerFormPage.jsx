import { ArrowLeft, Dumbbell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../components/common/Badge.jsx'
import { Button } from '../../components/common/Button.jsx'
import { LoadingScreen } from '../../components/common/LoadingScreen.jsx'
import { TrainerForm } from '../../components/trainers/TrainerForm.jsx'
import { createTrainer, getTrainer, updateTrainer } from '../../services/trainerApi.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

export function TrainerFormPage() {
  const { trainerId } = useParams()
  const navigate = useNavigate()
  const [trainer, setTrainer] = useState(null)
  const [loading, setLoading] = useState(Boolean(trainerId))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!trainerId) return undefined
    const controller = new AbortController()
    getTrainer(trainerId, { signal: controller.signal })
      .then(setTrainer)
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError, 'Could not load trainer.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [trainerId])

  async function handleSubmit(input) {
    setSubmitting(true)
    setError('')
    try {
      const saved = trainerId
        ? await updateTrainer(trainerId, input)
        : await createTrainer(input)
      navigate(`/trainers/${saved._id}`, { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not save trainer.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingScreen label="Loading trainer" />

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary" to="/trainers">
          <ArrowLeft aria-hidden="true" className="size-4" /> Trainers
        </Link>
        <div className="mt-4 flex items-center gap-2">
          <Dumbbell aria-hidden="true" className="size-5 text-text-secondary" />
          <Badge variant="neutral">M6</Badge>
        </div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{trainerId ? 'Edit trainer' : 'Add trainer'}</h2>
        <p className="mt-2 text-sm text-text-secondary">Maintain trainer contact and profile information.</p>
      </div>
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4" role="alert">
          <p className="text-sm text-danger">{error}</p>
          {!trainer && trainerId && <Button className="mt-3" as={Link} to="/trainers" variant="secondary">Back to trainers</Button>}
        </div>
      )}
      {(!trainerId || trainer) && (
        <TrainerForm
          trainer={trainer}
          submitting={submitting}
          onCancel={() => navigate(trainerId ? `/trainers/${trainerId}` : '/trainers')}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
