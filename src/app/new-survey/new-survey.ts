import {
  Component, signal, inject, output,
  ViewChild,
  ElementRef,
  HostListener,
  AfterViewChecked
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
export class NewSurvey implements AfterViewChecked {
  questionErrors = signal<number[]>([]);
  answerErrors = signal<number[]>([]);
  showSuccessOverlay = signal(false);
  closeOverlay = output<void>();
  supabase = inject(Supabase);
  router = inject(Router);
  surveyTitle = signal('');
  surveyTitleError = signal(false);
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

  updateSurveyTitle(title: string) {
    this.surveyTitle.set(title);
    if (title.trim()) {
      this.surveyTitleError.set(false);
    }
  }

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
    requestAnimationFrame(() => {
      this.updateAnswerScrollbar(questionId);
    });
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
    if (!this.validateSurvey()) {
      return;
    }

    this.surveyTitleError.set(false);

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
    if (!this.questionsScroll || !this.scrollTrack || !this.scrollThumb) return;

    this.isDragging = true;
    this.startY = event.clientY;
    this.startScrollTop = this.questionsScroll.nativeElement.scrollTop;

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

    event.preventDefault();
  }

  onDrag(event: PointerEvent): void {
    if (
      !this.isDragging ||
      !this.questionsScroll ||
      !this.scrollTrack ||
      !this.scrollThumb
    ) return;

    const list = this.questionsScroll.nativeElement;
    const track = this.scrollTrack.nativeElement;
    const thumb = this.scrollThumb.nativeElement;

    const maxScroll = list.scrollHeight - list.clientHeight;
    const maxThumbTop = track.clientHeight - thumb.offsetHeight;

    if (maxScroll <= 0 || maxThumbTop <= 0) return;

    const delta = event.clientY - this.startY;

    this.thumbTop = Math.max(
      0,
      Math.min(
        maxThumbTop,
        (this.startScrollTop / maxScroll) * maxThumbTop +
        (delta / maxThumbTop) * maxThumbTop
      )
    );

    list.scrollTop = (this.thumbTop / maxThumbTop) * maxScroll;
    this.updateScrollbar();
  }

  @HostListener('window:pointerup')
  @HostListener('window:pointercancel')
  @HostListener('window:blur')
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
  private answerDraggingId: number | null = null;
  private answerStartY = 0;
  private answerStartScrollTop = 0;

  private getAnswerElements(questionId: number) {
    const wrapper = document.querySelector(
      `[data-question-id="${questionId}"]`
    );

    if (!wrapper) return null;

    const list = wrapper.querySelector(
      '.new-survey__answer-list'
    ) as HTMLDivElement | null;

    const track = wrapper.querySelector(
      '.new-survey__answer-scroll-track'
    ) as HTMLDivElement | null;

    const thumb = wrapper.querySelector(
      '.new-survey__answer-scroll-thumb'
    ) as HTMLDivElement | null;

    if (!list || !track || !thumb) return null;

    return { list, track, thumb };
  }
  ngAfterViewChecked(): void {
    this.questions().forEach(question => {
      this.updateAnswerScrollbar(question.id);
    });
  }
  updateAnswerScrollbar(questionId: number): void {
    const elements = this.getAnswerElements(questionId);
    if (!elements) return;

    const { list, track, thumb } = elements;

    const maxScroll = list.scrollHeight - list.clientHeight;
    const ratio = list.clientHeight / list.scrollHeight;
    const thumbHeight = Math.max(30, track.clientHeight * ratio);

    thumb.style.height = `${Math.min(thumbHeight, track.clientHeight)}px`;

    const maxThumbTop = track.clientHeight - thumb.offsetHeight;

    thumb.style.top = `${maxScroll > 0
      ? (list.scrollTop / maxScroll) * maxThumbTop
      : 0
      }px`;

    track.style.visibility = maxScroll > 0 ? 'visible' : 'hidden';
  }

  startAnswerDragging(event: PointerEvent, questionId: number): void {
    const elements = this.getAnswerElements(questionId);
    if (!elements) return;

    this.answerDraggingId = questionId;
    this.answerStartY = event.clientY;
    this.answerStartScrollTop = elements.list.scrollTop;

    event.preventDefault();
  }

  @HostListener('document:pointermove', ['$event'])
  onAnswerDrag(event: PointerEvent): void {
    if (this.answerDraggingId === null) return;

    const elements = this.getAnswerElements(this.answerDraggingId);
    if (!elements) return;

    const { list, track, thumb } = elements;

    const maxScroll = list.scrollHeight - list.clientHeight;
    const maxThumbTop = track.clientHeight - thumb.offsetHeight;

    if (maxScroll <= 0 || maxThumbTop <= 0) return;

    const delta = event.clientY - this.answerStartY;

    list.scrollTop =
      this.answerStartScrollTop + (delta / maxThumbTop) * maxScroll;

    this.updateAnswerScrollbar(this.answerDraggingId);
  }

  @HostListener('document:pointerup')
  stopAnswerDragging(): void {
    this.answerDraggingId = null;
  }

  validateSurvey(): boolean {
    let isValid = true;

    if (!this.surveyTitle().trim()) {
      this.surveyTitleError.set(true);
      isValid = false;
    } else {
      this.surveyTitleError.set(false);
    }

    const invalidQuestions: number[] = [];
    const invalidAnswers: number[] = [];

    this.questions().forEach(question => {

      if (!question.text.trim()) {
        invalidQuestions.push(question.id);
        isValid = false;
      }

      if (question.answers.length < 2) {
        isValid = false;
      }

      question.answers.forEach(answer => {
        if (!answer.text.trim()) {
          invalidAnswers.push(answer.id);
          isValid = false;
        }
      });

    });

    this.questionErrors.set(invalidQuestions);
    this.answerErrors.set(invalidAnswers);

    return isValid;
  }

}
