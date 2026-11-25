'use client'

import type { SurveyQuestion } from '@/lib/survey'

interface Props {
  questions: SurveyQuestion[]
  answers: Record<number, number>
  onAnswerChange: (questionId: number, score: number) => void
}

export function QuestionList({ questions, answers, onAnswerChange }: Props) {
  return (
    <div className="divide-y rounded-xl border bg-white px-5 sm:px-7">
      {questions.map((q, index) => (
        <div key={q.id} className="py-5">
          <fieldset className="min-w-0">
            <legend className="mb-3 max-w-full wrap-anywhere text-xl font-semibold">{index + 1}. {q.content}</legend>
            <div className="grid grid-cols-1 gap-2 md:flex md:flex-wrap">
              {q.options.map((option, i) => (
                <label key={i} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border px-4 text-lg max-md:py-2 has-checked:border-teal-700 has-checked:bg-teal-50">
                  <input type="radio" name={'question-' + q.id} className="size-5 shrink-0 accent-teal-700"
                    checked={answers[q.id] === option.score}
                    onChange={() => onAnswerChange(q.id, option.score)} />
                  <span className="min-w-0 wrap-anywhere">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ))}
    </div>
  )
}
