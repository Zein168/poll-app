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
      if (this.activeTab === 'past') return false;
    } else {
      const days = this.getDaysUntil(survey.end_date);

      if (this.activeTab === 'active' && days < 0) return false;
      if (this.activeTab === 'past' && days >= 0) return false;
    }

    if (
      this.selectedCategory !== 'Sort by categories' &&
      this.selectedCategory !== 'All Surveys' &&
      survey.categories !== this.selectedCategory
    ) {
      return false;
    }

    return true;
  });
  }

  categoryDropdownOpen = false;

  selectedCategory = 'Sort by categories';

  categories = [
    'All Surveys',
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation',
  ];

  toggleCategoryDropdown() {
    this.categoryDropdownOpen = !this.categoryDropdownOpen;
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.categoryDropdownOpen = false;
  }

  categoryDropdownHovered = false;
}
