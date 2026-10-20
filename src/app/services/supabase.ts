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
}
