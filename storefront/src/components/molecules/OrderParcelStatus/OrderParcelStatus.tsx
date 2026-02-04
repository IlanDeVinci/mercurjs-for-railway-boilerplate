import { StepProgressBar } from "@/components/cells/StepProgressBar/StepProgressBar"
import { parcelStatuses, steps } from "@/lib/helpers/parcel-statuses"
import { HttpTypes } from "@medusajs/types"

export const OrderParcelStatus = ({
  order,
}: {
  order: HttpTypes.StoreOrder
}) => {
  const currentStep = parcelStatuses(order.fulfillment_status)

  return (
    <div>
      <StepProgressBar steps={steps} currentStep={currentStep} />
    </div>
  )
}
