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
        console.error('Fehler beim Laden der Umfrage:', error);
        return;
      }

      this.survey.set(data);
    }
  }
}
