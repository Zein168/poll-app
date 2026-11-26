import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Supabase } from '../services/supabase';
import { NewSurvey } from '../new-survey/new-survey';

@Component({
  selector: 'app-survey-detail',
  imports: [NewSurvey],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetail implements OnInit {
  supabase = inject(Supabase);
  route = inject(ActivatedRoute);
  survey = signal<{
    id: number;
    title: string;
    description: string | null;
    end_date: string | null;
    status: string;
    created_at: string;
    categories: string | null;
  } | null>(null);

  get isSurveyClosed(): boolean {
    const currentSurvey = this.survey();

    if (!currentSurvey) return false;

    const isInactive = currentSurvey.status !== 'active';

    const today = new Date();
    const todayString = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')
    ].join('-');

    const isPastEndDate =
      currentSurvey.end_date !== null &&
      currentSurvey.end_date.slice(0, 10) < todayString;

    return isInactive || isPastEndDate;
  }
  selectedAnswers = signal<Record<number, number[]>>({});

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(id) && id > 0) {
      await this.supabase.getQuestions(id);
      await this.supabase.getAnswersForSurvey(id);
      await this.supabase.getSurveyStatistics();

      const { data, error } = await this.supabase.supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('error', error);
        return;
      }

      this.survey.set(data);
    }

  }
  updateSelectedAnswer(
    questionId: number,
    answerId: number,
    checked: boolean,
    allowMultiple: boolean
  ) {
    this.selectedAnswers.update(selected => {
      const currentAnswers = selected[questionId] ?? [];

      let newAnswers: number[];

      if (allowMultiple) {
        newAnswers = checked
          ? [...currentAnswers, answerId]
          : currentAnswers.filter(value => value !== answerId);
      } else {
        newAnswers = checked ? [answerId] : [];
      }

      return {
        ...selected,
        [questionId]: newAnswers
      };
    });
  }

  async completeSurvey() {
    if (this.isSurveyClosed) {
      alert('This survey has already ended.');
      return;
    }
    const questions = this.supabase.questions();
    const selected = this.selectedAnswers();
    const unanswered = questions.some(
      question => !selected[question.id]?.length
    );

    if (unanswered) {
      alert('Please answer all questions.');
      return;
    }


    const responseData = questions.flatMap(question =>
      (selected[Number(question.id)] ?? []).map(answerId => ({
        question_id: question.id,
        answer_id: answerId,
        participant_id: null
      }))
    );


    const { error } = await this.supabase.supabase
      .from('responses')
      .insert(responseData);

    if (error) {
      console.error('Response error:', error);
      alert('Error submitting your answers.');
      return;
    }


    await this.supabase.getSurveyStatistics();

    alert('Thank you! Your answers have been submitted.');


    this.selectedAnswers.set({});
  }

  formatDate(date: string | null): string {
    if (!date) return '';

    const [year, month, day] = date.split('T')[0].split('-');
    return `${day}.${month}.${year}`;
  }

  formatCategory(category: string | null): string {
    if (!category) return '';

    return category
      .split(/[-&]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  hasVotes(): boolean {
    return this.supabase.statistics().some(item => item.votes > 0);
  }
  showSurveyOverlay = false;

  openSurveyOverlay() {
    this.showSurveyOverlay = true;
  }

  closeSurveyOverlay() {
    this.showSurveyOverlay = false;
  }
}
