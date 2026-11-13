import {
  Component, OnInit, inject,
  ViewChild,
  ElementRef,
  HostListener,
  AfterViewInit
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Supabase } from '../services/supabase';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',

})
export class Dashboard implements OnInit, AfterViewInit {
  supabase = inject(Supabase);

  ngOnInit() {
    this.supabase.getSurveys();
  }

  ngAfterViewInit() {
    this.updateScrollbar();
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
        this.selectedCategory &&
        this.selectedCategory !== 'All Surveys' &&
        survey.categories !== this.selectedCategory
      ) {
        return false;
      }

      return true;
    });
  }

  categoryDropdownOpen = false;

  selectedCategory = '';

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

  get endingSoonSurveys() {
    return this.supabase.surveys().filter((survey) => {
      if (!survey.end_date) return false;

      const days = this.getDaysUntil(survey.end_date);

      return days >= 0 && days <= 7;
    });
  }
  @ViewChild('surveyList') surveyList?: ElementRef<HTMLDivElement>;
  @ViewChild('scrollTrack') scrollTrack?: ElementRef<HTMLDivElement>;

  thumbTop = 60;
  thumbHeight = 80;
  isDragging = false;
  startY = 0;
  startScrollTop = 0;

 updateScrollbar() {
  if (!this.surveyList || !this.scrollTrack) return;

  const list = this.surveyList.nativeElement;
  const track = this.scrollTrack.nativeElement;

  const maxScroll = list.scrollHeight - list.clientHeight;
  const maxThumbTop = track.clientHeight - this.thumbHeight;

  this.thumbTop = maxScroll > 0
    ? (list.scrollTop / maxScroll) * maxThumbTop + 60
    : 60;
}

  startDragging(event: PointerEvent) {
    if (!this.surveyList) return;

    this.isDragging = true;
    this.startY = event.clientY;
    this.startScrollTop = this.surveyList.nativeElement.scrollTop;

    event.preventDefault();
  }

  @HostListener('document:pointermove', ['$event'])
  onDrag(event: PointerEvent) {
    if (!this.isDragging || !this.surveyList || !this.scrollTrack) return;

    const list = this.surveyList.nativeElement;
    const track = this.scrollTrack.nativeElement;

    const maxScroll = list.scrollHeight - list.clientHeight;
    const maxThumbTop = track.clientHeight - this.thumbHeight;

    if (maxThumbTop <= 0 || maxScroll <= 0) return;

    const delta = event.clientY - this.startY;

    list.scrollTop = this.startScrollTop +
      (delta / maxThumbTop) * maxScroll;
  }

  @HostListener('document:pointerup')
  stopDragging() {
    this.isDragging = false;
  }
}
