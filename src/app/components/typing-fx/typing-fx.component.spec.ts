import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypingFXComponent } from './typing-fx.component';

describe('TypingFXComponent', () => {
  let component: TypingFXComponent;
  let fixture: ComponentFixture<TypingFXComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypingFXComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TypingFXComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
