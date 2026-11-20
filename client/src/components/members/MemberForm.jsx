import { useState } from 'react'
import { Button } from '../common/Button.jsx'
import { Card } from '../common/Card.jsx'
import { TextField } from '../common/TextField.jsx'
import { memberToFormValues } from '../../utils/memberForm.js'

const emptyValues = {
  fullName: '',
  fatherName: '',
  phone: '',
  email: '',
  gender: '',
  dateOfBirth: '',
  addressText: '',
  profileImage: '',
  emergencyName: '',
  emergencyPhone: '',
  notes: '',
}

export function MemberForm({ member, submitting, errors = {}, onCancel, onSubmit }) {
  const [values, setValues] = useState(() => (member ? memberToFormValues(member) : emptyValues))

  function setField(field) {
    return (event) => {
      setValues((current) => ({ ...current, [field]: event.target.value }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const emergencyName = values.emergencyName.trim()
    const emergencyPhone = values.emergencyPhone.trim()
    const payload = {
      fullName: values.fullName.trim(),
      fatherName: values.fatherName.trim(),
      phone: values.phone.trim(),
      email: values.email.trim() || null,
      gender: values.gender.trim() || null,
      dateOfBirth: values.dateOfBirth || null,
      address: values.addressText.trim() ? { text: values.addressText.trim() } : null,
      profileImage: values.profileImage.trim() || null,
      emergencyContact:
        emergencyName || emergencyPhone
          ? { name: emergencyName, phone: emergencyPhone }
          : null,
      notes: values.notes.trim() || null,
    }
    await onSubmit(payload)
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card className="p-5 sm:p-7">
        <div>
          <h3 className="text-base font-semibold">Personal information</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Member code is generated automatically after the record is saved.
          </p>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <TextField
            autoComplete="name"
            error={errors.fullName}
            id="fullName"
            label="Full name"
            maxLength={100}
            onChange={setField('fullName')}
            required
            value={values.fullName}
          />
          <TextField
            error={errors.fatherName}
            id="fatherName"
            label="Father's name"
            maxLength={100}
            onChange={setField('fatherName')}
            value={values.fatherName}
          />
          <TextField
            autoComplete="tel"
            error={errors.phone}
            id="phone"
            label="Phone number"
            maxLength={40}
            onChange={setField('phone')}
            placeholder="+91 98765 43210"
            required
            hint="10-digit Indian mobile numbers are saved with +91. Add a country code for international numbers."
            type="tel"
            value={values.phone}
          />
          <TextField
            autoComplete="email"
            error={errors.email}
            id="email"
            label="Email (optional)"
            maxLength={254}
            onChange={setField('email')}
            type="email"
            value={values.email}
          />
          <TextField
            error={errors.gender}
            id="gender"
            label="Gender (optional)"
            maxLength={50}
            onChange={setField('gender')}
            value={values.gender}
          />
          <TextField
            error={errors.dateOfBirth}
            id="dateOfBirth"
            label="Date of birth (optional)"
            onChange={setField('dateOfBirth')}
            type="date"
            value={values.dateOfBirth}
          />
        </div>
      </Card>

      <Card className="p-5 sm:p-7">
        <div>
          <h3 className="text-base font-semibold">Additional information</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Optional details can be updated or removed later.
          </p>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <TextField
            error={errors.address}
            id="address"
            label="Address (optional)"
            maxLength={500}
            onChange={setField('addressText')}
            value={values.addressText}
          />
          <TextField
            error={errors.profileImage}
            id="profileImage"
            label="Profile image URL (optional)"
            maxLength={2048}
            onChange={setField('profileImage')}
            type="url"
            value={values.profileImage}
          />
          <TextField
            error={errors.emergencyContact}
            id="emergencyName"
            label="Emergency contact name (optional)"
            maxLength={100}
            onChange={setField('emergencyName')}
            value={values.emergencyName}
          />
          <TextField
            error={errors.emergencyContact}
            id="emergencyPhone"
            label="Emergency contact phone (optional)"
            maxLength={40}
            onChange={setField('emergencyPhone')}
            placeholder="+91 98765 43210"
            hint="Provide both emergency contact name and phone."
            type="tel"
            value={values.emergencyPhone}
          />
        </div>
        {errors.emergencyContact && (
          <p className="mt-2 text-sm text-danger">{errors.emergencyContact}</p>
        )}
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="notes">
            Admin notes (optional)
          </label>
          <textarea
            aria-describedby={errors.notes ? 'notes-error' : undefined}
            aria-invalid={Boolean(errors.notes)}
            className={`min-h-28 w-full resize-y rounded-xl border bg-bg px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-focus focus:ring-2 focus:ring-focus/30 ${
              errors.notes ? 'border-danger' : 'border-border'
            }`}
            id="notes"
            maxLength={2000}
            onChange={setField('notes')}
            value={values.notes}
          />
          {errors.notes && (
            <p className="mt-2 text-sm text-danger" id="notes-error">
              {errors.notes}
            </p>
          )}
        </div>
      </Card>

      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Button onClick={onCancel} type="button" variant="secondary">
          Cancel
        </Button>
        <Button loading={submitting} type="submit">
          {member ? 'Save changes' : 'Create member'}
        </Button>
      </div>
    </form>
  )
}
