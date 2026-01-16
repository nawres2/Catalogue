import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OnboardingManagement } from './onboarding-management';

describe('OnboardingManagement', () => {
  let component: OnboardingManagement;
  let fixture: ComponentFixture<OnboardingManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OnboardingManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
