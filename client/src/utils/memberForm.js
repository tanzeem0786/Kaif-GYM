function formatInputDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

export function memberToFormValues(member) {
  return {
    firstName: member?.firstName ?? '',
    lastName: member?.lastName ?? '',
    phone: member?.phone ?? '',
    email: member?.email ?? '',
    gender: member?.gender ?? '',
    dateOfBirth: formatInputDate(member?.dateOfBirth),
    addressText: member?.address?.text ?? '',
    profileImage: member?.profileImage ?? '',
    emergencyName: member?.emergencyContact?.name ?? '',
    emergencyPhone: member?.emergencyContact?.phone ?? '',
    notes: member?.notes ?? '',
  }
}
