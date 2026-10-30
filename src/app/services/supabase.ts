import { Injectable, signal } from '@angular/core';
import { createClient } from '@supabase/supabase-js'

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  supabase = createClient('https://jsncgqhbmuzfqpwvrjec.supabase.co', 'sb_publishable_uzVEn8WT2zeIBUyuCs-OqQ_T-inzyq_')

  surveys = signal<{
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    end_date: string | null;
    status: string;
    categories: string | null;
  }[]>([]);

  async getSurveys() {
    const { data, error } = await this.supabase
      .from('surveys')
      .select('*');

    if (error) {
      console.error('Fehler beim Laden der Umfragen:', error);
      return;
    }

    this.surveys.set(data ?? []);
  }

  questions = signal<{
    id: number;
    survey_id: number;
    question_text: string;
    question_type: string;
    position: number;
  }[]>([]);

  async getQuestions(surveyId: number) {
    const { data, error } = await this.supabase
      .from('questions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Fehler beim Laden der Fragen:', error);
      return;
    }

    this.questions.set(data ?? []);
  }

  answers = signal<{
    id: number;
    question_id: number;
    answer_text: string;
    created_at: string;
  }[]>([]);

  async getAnswersForSurvey(surveyId: number) {
    const { data: questions, error: questionsError } = await this.supabase
      .from('questions')
      .select('id')
      .eq('survey_id', surveyId);

    if (questionsError) {
      console.error('Fehler beim Laden der Fragen-IDs:', questionsError);
      return;
    }

    const questionIds = (questions ?? []).map(question => question.id);

    if (questionIds.length === 0) {
      this.answers.set([]);
      return;
    }

    const { data, error } = await this.supabase
      .from('answers')
      .select('*')
      .in('question_id', questionIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fehler beim Laden der Antworten:', error);
      return;
    }

    this.answers.set(data ?? []);
  }

  statistics = signal<{
    question_id: number;
    answer_id: number;
    votes: number;
  }[]>([]);

  async getSurveyStatistics() {
    const questionIds = this.questions().map(question => question.id);

    if (questionIds.length === 0) {
      this.statistics.set([]);
      return;
    }

    const { data, error } = await this.supabase
      .from('survey_statistics')
      .select('*')
      .in('question_id', questionIds);

    if (error) {
      console.error('Fehler beim Laden der Statistik:', error);
      return;
    }

    this.statistics.set(data ?? []);
  }

  getTotalVotes(questionId: number): number {
    return this.statistics()
      .filter(item => item.question_id === questionId)
      .reduce((total, item) => total + item.votes, 0);
  }

  getAnswerPercentage(questionId: number, answerId: number): number {
    const answer = this.statistics().find(
      item =>
        item.question_id === questionId &&
        item.answer_id === answerId
    );

    const total = this.getTotalVotes(questionId);

    if (!answer || total === 0) {
      return 0;
    }

    return Math.round((answer.votes / total) * 100);
  }
}