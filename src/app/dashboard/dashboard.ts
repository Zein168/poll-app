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
}
