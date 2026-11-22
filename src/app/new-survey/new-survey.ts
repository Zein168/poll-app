import {
  Component, signal, inject, output,
  ViewChild,
  ElementRef,
  HostListener
} from '@angular/core';
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
  standalone: true,
  imports: [],
  templateUrl: './new-survey.html',
  styleUrl: './new-survey.scss',
})
export class NewSurvey {
  showSuccessOverlay = signal(false);
  closeOverlay = output<void>();
  supabase = inject(Supabase);
  router = inject(Router);
  surveyTitle = signal('');
  description = signal('');
  endDate = signal('');
  category = signal('');
  questions = signal<SurveyQuestion[]>([
    {
      id: 1,
      text: '',
      allowMultipleAnswers: false,
      answers: [
        { id: 1, text: '' },
        { id: 2, text: '' },
      ],
    },
  ]);

  private nextQuestionId = 2;
  private nextAnswerId = 3;

  addAnswer(questionId: number) {
    this.questions.update(questions =>
      questions.map(question =>
        question.id === questionId
          ? {
            ...question,
            answers: question.answers.length < 6
              ? [
                ...question.answers,
                { id: this.nextAnswerId++, text: '' },
              ]
              : question.answers,
          }
          : question
      )
    );
  }

  addQuestion() {
    this.questions.update(questions => [
      ...questions,
      {
        id: this.nextQuestionId++,
        text: '',
        allowMultipleAnswers: false,
        answers: [
          { id: this.nextAnswerId++, text: '' },
          { id: this.nextAnswerId++, text: '' },
        ],
      },
    ]);
    this.scrollToNewQuestion();
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

    this.showSuccessOverlay.set(true);
  }


  categoryDropdownOpen = false;
  categoryDropdownHovered = false;

  categories = [
    { value: 'all-survey', label: 'All Survey' },
    { value: 'team-activities', label: 'Team Activities' },
    { value: 'health-wellness', label: 'Health & Wellness' },
    { value: 'gaming-entertainment', label: 'Gaming & Entertainment' },
    { value: 'education-learning', label: 'Education & Learning' },
    { value: 'lifestyle-preferences', label: 'Lifestyle & Preferences' },
    { value: 'technology-innovation', label: 'Technology & Innovation' },
  ];

  toggleCategoryDropdown() {
    this.categoryDropdownOpen = !this.categoryDropdownOpen;
  }

  selectCategory(value: string) {
    this.category.set(value);
    this.categoryDropdownOpen = false;
  }

  getSelectedCategoryLabel(): string {
    return this.categories.find(
      item => item.value === this.category()
    )?.label || '';
  }

  deleteQuestion(questionId: number, index: number): void {
    this.questions.update((questions) => {
      if (index === 0) {
        return questions;
      }

      return questions.filter(
        (question) => question.id !== questionId
      );
    });
  }

  clearQuestion(questionId: number): void {
    this.questions.update(questions =>
      questions.map(question =>
        question.id === questionId
          ? {
            ...question,
            text: '',
            answers: question.answers.map(answer => ({
              ...answer,
              text: '',
            })),
          }
          : question
      )
    );
  }

  @ViewChild('questionsScroll')
  questionsScroll?: ElementRef<HTMLDivElement>;

  @ViewChild('scrollTrack')
  scrollTrack?: ElementRef<HTMLDivElement>;

  @ViewChild('scrollThumb')
  scrollThumb?: ElementRef<HTMLDivElement>;

  thumbTop = 0;
  thumbHeight = 60;

  isDragging = false;
  startY = 0;
  startScrollTop = 0;

  updateScrollbar(): void {
    if (!this.questionsScroll || !this.scrollTrack || !this.scrollThumb) return;

    const list = this.questionsScroll.nativeElement;
    const track = this.scrollTrack.nativeElement;

    const maxScroll = list.scrollHeight - list.clientHeight;
    const thumbHeight = this.scrollThumb.nativeElement.offsetHeight;
    const maxThumbTop = track.clientHeight - thumbHeight;

    this.thumbTop = maxScroll > 0
      ? (list.scrollTop / maxScroll) * maxThumbTop
      : 0;
  }
  startDragging(event: PointerEvent): void {
    if (!this.questionsScroll) return;

    this.isDragging = true;
    this.startY = event.clientY;
    this.startScrollTop =
      this.questionsScroll.nativeElement.scrollTop;

    event.preventDefault();
  }

  @HostListener('document:pointermove', ['$event'])
  onDrag(event: PointerEvent): void {
    if (!this.isDragging || !this.questionsScroll || !this.scrollTrack) return;

    const list = this.questionsScroll.nativeElement;
    const track = this.scrollTrack.nativeElement;

    const maxScroll = list.scrollHeight - list.clientHeight;
    const maxThumbTop = track.clientHeight - this.thumbHeight;

    if (maxScroll <= 0 || maxThumbTop <= 0) return;

    const delta = event.clientY - this.startY;

    list.scrollTop =
      this.startScrollTop + (delta / maxThumbTop) * maxScroll;

    this.updateScrollbar();
  }

  @HostListener('document:pointerup')
  stopDragging(): void {
    this.isDragging = false;
  }

  scrollToNewQuestion(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const element = this.questionsScroll?.nativeElement;

        if (element) {
          element.scrollTo({
            top: element.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
    });
  }
}
