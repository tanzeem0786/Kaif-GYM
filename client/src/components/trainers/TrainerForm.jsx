import { useState } from 'react'
import { Button } from '../common/Button.jsx'
import { Card } from '../common/Card.jsx'
import { TextField } from '../common/TextField.jsx'

function getInitialValues(trainer) {
  return {
    firstName: trainer?.firstName ?? '',
    lastName: trainer?.lastName ?? '',
    phone: trainer?.phone ?? '',
    email: trainer?.email ?? '',
    profileImage: trainer?.profileImage ?? '',
    specialization: trainer?.specialization?.join(', ') ?? '',
    joiningDate: trainer?.joiningDate?.slice(0, 10) ?? '',
    notes: trainer?.notes ?? '',
  }
}

export function TrainerForm({ trainer, submitting, onCancel, onSubmit }) {
  const [values, setValues] = useState(() => getInitialValues(trainer))

  function setField(field) {
    return (event) => setValues((current) => ({ ...current, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await onSubmit({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: values.phone.trim(),
      email: values.email.trim() || null,
      profileImage: values.profileImage.trim() || null,
      specialization: values.specialization
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      joiningDate: values.joiningDate || undefined,
      notes: values.notes.trim() || null,
    })
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card className="p-5 sm:p-7">
        <div>
          <h3 className="text-base font-semibold">Trainer profile</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Trainer code is generated automatically after saving.
          </p>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <TextField autoComplete="given-name" id="firstName" label="First name" maxLength={100} onChange={setField('firstName')} required value={values.firstName} />
          <TextField autoComplete="family-name" id="lastName" label="Last name" maxLength={100} onChange={setField('lastName')} required value={values.lastName} />
          <TextField autoComplete="tel" id="phone" label="Phone number" maxLength={40} onChange={setField('phone')} placeholder="+91 98765 43210" required type="tel" value={values.phone} />
          <TextField autoComplete="email" id="email" label="Email (optional)" maxLength={254} onChange={setField('email')} type="email" value={values.email} />
          <TextField id="specialization" label="Specializations (comma-separated)" maxLength={1000} onChange={setField('specialization')} value={values.specialization} />
          <TextField id="joiningDate" label="Joining date" onChange={setField('joiningDate')} type="date" value={values.joiningDate} />
          <TextField className="sm:col-span-2" id="profileImage" label="Profile image URL (optional)" maxLength={2048} onChange={setField('profileImage')} type="url" value={values.profileImage} />
        </div>
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="trainer-notes">
            Admin notes (optional)
          </label>
          <textarea
            className="min-h-28 w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-focus focus:ring-2 focus:ring-focus/30"
            id="trainer-notes"
            maxLength={2000}
            onChange={setField('notes')}
            value={values.notes}
          />
        </div>
      </Card>
      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Button onClick={onCancel} type="button" variant="secondary">Cancel</Button>
        <Button loading={submitting} type="submit">{trainer ? 'Save changes' : 'Create trainer'}</Button>
      </div>
    </form>
  )
}
