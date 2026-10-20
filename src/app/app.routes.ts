import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { NewSurvey } from './new-survey/new-survey';
import { SurveyDetail } from './survey-detail/survey-detail';

export const routes: Routes = [
    { path: '', component: Dashboard },
    { path: 'new-survey', component: NewSurvey },
    { path: 'survey/:id', component: SurveyDetail }
];
