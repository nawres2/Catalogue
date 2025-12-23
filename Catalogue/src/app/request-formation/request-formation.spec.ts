import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestFormation } from './request-formation';

describe('RequestFormation', () => {
  let component: RequestFormation;
  let fixture: ComponentFixture<RequestFormation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestFormation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestFormation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
