import { StepProgressBar } from "@/components/cells/StepProgressBar/StepProgressBar"
import { parcelStatuses, steps } from "@/lib/helpers/parcel-statuses"

export default {}
export const OrderParcelStatus = ({ order }: { order: any }) => {
  const currentStep = parcelStatuses(order.fulfillment_status)

  return (
    <div>
      <StepProgressBar steps={steps} currentStep={currentStep} />
    </div>
  )
}
