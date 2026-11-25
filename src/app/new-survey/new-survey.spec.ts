import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewSurvey } from './new-survey';

describe('NewSurvey', () => {
  let component: NewSurvey;
  let fixture: ComponentFixture<NewSurvey>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewSurvey],
    }).compileComponents();

    fixture = TestBed.createComponent(NewSurvey);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows an inline error when the survey name is empty', async () => {
    await component.publishSurvey();
    fixture.detectChanges();

    expect(component.surveyTitleError()).toBe(true);
    expect(fixture.nativeElement.querySelector('#survey-name-error')).toBeTruthy();
  });

  it('clears the survey name error after entering a non-empty name', () => {
    component.surveyTitleError.set(true);

    component.updateSurveyTitle('My survey');

    expect(component.surveyTitle()).toBe('My survey');
    expect(component.surveyTitleError()).toBe(false);
  });
});
