import { Component, signal, inject } from '@angular/core';
import { Supabase } from '../services/supabase';
import { Router } from '@angular/router';

interface SurveyAnswer {
  id: number;
  text: string;
}

interface SurveyQuestion {
  id: number;
  text: string;
  answers: SurveyAnswer[];
  allowMultipleAnswers: boolean;
}

@Component({
  selector: 'app-new-survey',
  imports: [],
  templateUrl: './new-survey.html',
  styleUrl: './new-survey.scss',
})
export class NewSurvey {
  supabase = inject(Supabase);
  router = inject(Router);

  surveyTitle = signal('');
  description = signal('');
  endDate = signal('');
  category = signal('');
  questions = signal<SurveyQuestion[]>([
    {
      id: 1,
      text: 'Which date would work best for you?',
      allowMultipleAnswers: false,
      answers: [
        { id: 1, text: '' },
        { id: 2, text: '' },
      ],
    },
  ]);

  private nextId = 3;

  addAnswer(questionId: number) {
    this.questions.update(questions =>
      questions.map(question =>
        question.id === questionId
          ? {
            ...question,
            answers: [
              ...question.answers,
              { id: this.nextId++, text: '' },
            ],
          }
          : question
      )
    );
  }

  addQuestion() {
    this.questions.update(questions => [
      ...questions,
      {
        id: this.nextId++,
        text: '',
        allowMultipleAnswers: false,
        answers: [
          { id: this.nextId++, text: '' },
          { id: this.nextId++, text: '' },
        ],
      },
    ]);
  }

  updateQuestion(questionId: number, text: string) {
    this.questions.update(questions =>
      questions.map(question =>
        question.id === questionId
          ? { ...question, text }
          : question
      )
    );
  }

  updateAnswer(questionId: number, answerId: number, text: string) {
    this.questions.update(questions =>
      questions.map(question =>
        question.id === questionId
          ? {
            ...question,
            answers: question.answers.map(answer =>
              answer.id === answerId
                ? { ...answer, text }
                : answer
            ),
          }
          : question
      )
    );
  }

  updateMultipleAnswers(questionId: number, checked: boolean) {
    this.questions.update(questions =>
      questions.map(question =>
        question.id === questionId
          ? { ...question, allowMultipleAnswers: checked }
          : question
      )
    );
  }

  async publishSurvey() {
    if (!this.surveyTitle().trim()) {
      alert('Please enter a survey name.');
      return;
    }

    if (this.questions().length === 0) {
      alert('Please add at least one question.');
      return;
    }

    for (const question of this.questions()) {
      if (!question.text.trim()) {
        alert('Please enter all questions.');
        return;
      }

      if (question.answers.length < 2 ||
        question.answers.some(answer => !answer.text.trim())) {
        alert('Please enter at least two answers for every question.');
        return;
      }
    }

    const { data: survey, error: surveyError } = await this.supabase.supabase
      .from('surveys')
      .insert({
        title: this.surveyTitle().trim(),
        description: this.description().trim() || null,
        end_date: this.endDate() || null,
        categories: this.category() || null,
        status: 'active',
      })
      .select('id')
      .single();

    if (surveyError) {
      console.error('Survey error:', surveyError);
      alert('Error saving survey.');
      return;
    }

    for (let i = 0; i < this.questions().length; i++) {
      const question = this.questions()[i];

      const { data: savedQuestion, error: questionError } =
        await this.supabase.supabase
          .from('questions')
          .insert({
            survey_id: survey.id,
            question_text: question.text.trim(),
            question_type: question.allowMultipleAnswers
              ? 'multiple_choice'
              : 'single_choice',
            allow_multiple_answers: question.allowMultipleAnswers,
            position: i + 1,
          })
          .select('id')
          .single();

      if (questionError) {
        console.error('Question error:', questionError);
        alert('Error saving question.');
        return;
      }

      const answerData = question.answers.map(answer => ({
        question_id: savedQuestion.id,
        answer_text: answer.text.trim(),
      }));

      const { error: answerError } = await this.supabase.supabase
        .from('answers')
        .insert(answerData);

      if (answerError) {
        console.error('Answer error:', answerError);
        alert('Error saving answers.');
        return;
      }
    }

    await this.router.navigate(['/survey', survey.id]);
  }

}
