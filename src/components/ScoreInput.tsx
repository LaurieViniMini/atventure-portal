'use client'

interface ScoreInputProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export default function ScoreInput({
  value,
  onChange,
  disabled,
}: ScoreInputProps) {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          disabled={disabled}
          onClick={() => onChange(score)}
          className={`
            w-10 h-10 rounded-lg text-sm font-semibold transition-all
            ${disabled ? 'cursor-default' : 'cursor-pointer hover:scale-105'}
            ${
              value === score
                ? 'bg-primary text-white shadow-md shadow-primary/30'
                : 'bg-gray-100 text-gray-500 hover:bg-primary/10 hover:text-primary'
            }
          `}
        >
          {score}
        </button>
      ))}
    </div>
  )
}
