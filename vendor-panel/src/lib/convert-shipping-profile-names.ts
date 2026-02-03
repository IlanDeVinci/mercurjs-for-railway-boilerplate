export default (sp: any) => {
  const rawName = sp?.shipping_profile?.name
  if (!rawName) {
    return sp
  }

  const name = rawName.includes(":") ? rawName.split(":")[1] : rawName

  return {
    ...sp,
    shipping_profile: {
      ...sp.shipping_profile,
      name,
    },
  }
}
