import { useState } from 'react'
import { Button } from '../common/Button.jsx'
import { Card } from '../common/Card.jsx'
import { TextField } from '../common/TextField.jsx'
import { parseRupeesToPaise } from '../../utils/membershipFormat.js'

export function MembershipPlanForm({
  plan,
  errors = {},
  submitting = false,
  onCancel,
  onSubmit,
}) {
  const [values, setValues] = useState({
    name: plan?.name ?? '',
    durationMonths: String(plan?.durationMonths ?? 1),
    price: plan ? (plan.pricePaise / 100).toFixed(2) : '',
    description: plan?.description ?? '',
  })

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      name: values.name.trim(),
      durationMonths: Number(values.durationMonths),
      pricePaise: parseRupeesToPaise(values.price),
      description: values.description.trim(),
    })
  }

  return (
    <Card className="p-5 sm:p-7">
      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        <TextField
          autoComplete="off"
          error={errors.name}
          id="plan-name"
          label="Plan name"
          maxLength={100}
          onChange={(event) => update('name', event.target.value)}
          required
          value={values.name}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-2 text-sm font-medium text-text-primary">
            <span>Duration</span>
            <select
              aria-invalid={Boolean(errors.durationMonths)}
              className="min-h-12 w-full rounded-xl border border-border bg-bg px-4 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30"
              onChange={(event) => update('durationMonths', event.target.value)}
              value={values.durationMonths}
            >
              <option value="1">1 month</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
            </select>
            {errors.durationMonths && <span className="block text-danger">{errors.durationMonths}</span>}
          </label>
          <TextField
            error={errors.pricePaise || errors.price}
            id="plan-price"
            inputMode="decimal"
            label="Plan price (INR)"
            onChange={(event) => update('price', event.target.value)}
            placeholder="e.g. 3000.00"
            required
            value={values.price}
          />
        </div>
        <label className="block space-y-2 text-sm font-medium text-text-primary" htmlFor="plan-description">
          <span>Description <span className="font-normal text-text-muted">(optional)</span></span>
          <textarea
            className="min-h-28 w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-focus focus:ring-2 focus:ring-focus/30"
            id="plan-description"
            maxLength={1000}
            onChange={(event) => update('description', event.target.value)}
            value={values.description}
          />
          {errors.description && <span className="block text-danger">{errors.description}</span>}
        </label>
        {errors.form && <p className="text-sm text-danger" role="alert">{errors.form}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button disabled={submitting} onClick={onCancel} type="button" variant="secondary">
            Cancel
          </Button>
          <Button loading={submitting} type="submit">
            {plan ? 'Save changes' : 'Create plan'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
