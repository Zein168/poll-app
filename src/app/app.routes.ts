import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { NewSurvey } from './new-survey/new-survey';

export const routes: Routes = [
    { path: '', component: Dashboard },
    { path: 'new-survey', component: NewSurvey }
];
