function formatInputDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

export function memberToFormValues(member) {
  return {
    fullName: member?.fullName ?? '',
    fatherName: member?.fatherName ?? '',
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
