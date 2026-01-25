'use client'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface QuestionOption {
  label: string
  score: number
}

interface Question {
  id: number
  order: number
  content: string
  options: QuestionOption[]
}

interface QuestionListProps {
  questions: Question[]
  answers: Record<number, number>
  onAnswerChange: (questionId: number, score: number) => void
}

export function QuestionList({ questions, answers, onAnswerChange }: QuestionListProps) {
  return (
    <div className="space-y-6">
      {questions.map((question) => (
        <div key={question.id} className="space-y-3 border-b pb-4 last:border-b-0">
          <div className="font-medium">
            {question.order}. {question.content}
          </div>
          <RadioGroup
            value={answers[question.id]?.toString() || ''}
            onValueChange={(value) => onAnswerChange(question.id, parseInt(value))}
          >
            {question.options.map((option) => (
              <div key={option.score} className="flex items-center space-x-2">
                <RadioGroupItem value={option.score.toString()} id={`q${question.id}-${option.score}`} />
                <Label htmlFor={`q${question.id}-${option.score}`} className="cursor-pointer font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}
    </div>
  )
}
