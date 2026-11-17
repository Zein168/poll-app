import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Supabase } from '../services/supabase';

@Component({
  selector: 'app-survey-detail',
  imports: [],
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
      const id = Number(questionId);
      const answer = Number(answerId);
      const currentAnswers = selected[questionId] ?? [];

      let newAnswers: number[];

      if (allowMultiple) {
        newAnswers = checked
          ? [...currentAnswers, answerId]
          : currentAnswers.filter(value => value !== answer);
      } else {
        newAnswers = checked ? [answerId] : [];
      }

      return {
        ...selected,
        [id]: newAnswers
      };
    });
  }

  async completeSurvey() {
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
}
