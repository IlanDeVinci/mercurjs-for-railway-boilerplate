"use client"

export const ProductListingHeader = ({ total }: { total: number }) => {
  return (
    <div className="flex justify-between w-full items-center">
      <div>{total} listings</div>
      {/* <div className='hidden md:flex gap-2 items-center'>
        Sort by:{' '}
        <SelectField
          className='min-w-[200px]'
          options={selectOptions}
          selectOption={selectOptionHandler}
        />
      </div> */}
    </div>
  )
}
