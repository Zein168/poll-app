import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Supabase } from '../services/supabase';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',

})
export class Dashboard implements OnInit {
  supabase = inject(Supabase);

  ngOnInit() {
    this.supabase.getSurveys();
  }

  getDaysUntil(endDate: string): number {
    const today = new Date();
    const end = new Date(endDate);

    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return Math.ceil(
      (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  activeTab: 'active' | 'past' = 'active';

  get filteredSurveys() {
    return this.supabase.surveys().filter((survey) => {
      if (!survey.end_date) {
        return this.activeTab === 'active';
      }

      const days = this.getDaysUntil(survey.end_date);

      return this.activeTab === 'active' ? days >= 0 : days < 0;
    });
  }
}
