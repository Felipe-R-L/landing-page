import { CommonModule, NgIf } from '@angular/common';
import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Output,
  EventEmitter,
} from '@angular/core';
import { interval, Subscription, timer } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface Segment {
  // Exportando a interface para uso externo
  type: 'plain' | 'styled';
  content: string;
  classes?: string;
}

@Component({
  selector: 'app-typing-fx',
  standalone: true,
  imports: [CommonModule, NgIf],
  templateUrl: './typing-fx.component.html',
  styleUrls: ['./typing-fx.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypingFXComponent implements OnInit, OnDestroy {
  @Input() segments: Segment[] = [];
  @Input() typingSpeed: number = 100;
  @Input() cursorChar: string = '|';
  @Input() cursorSpeed: number = 500;
  @Input() infinite: boolean = false;
  @Input() initialDelay: number = 0;
  @Input() endDelay: number = 1500;
  @Input() cursorOffsetBottom: number = 0;

  @Output() typingCompleteEvent = new EventEmitter<void>();

  highlightedDisplayText: SafeHtml = '';
  showCursor: boolean = true;
  typingActive: boolean = false;
  typingComplete: boolean = false;

  private segmentIndex: number = 0;
  private charIndexInSegment: number = 0;
  private displayTextHtml: string = '';

  private typingSubscription: Subscription | undefined;
  private cursorSubscription: Subscription | undefined;
  private initialDelaySubscription: Subscription | undefined;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.initialDelay > 0) {
      this.initialDelaySubscription = timer(this.initialDelay).subscribe(() => {
        this.startTypingProcess();
      });
    } else {
      this.startTypingProcess();
    }
  }

  ngOnDestroy(): void {
    this.initialDelaySubscription?.unsubscribe();
    this.typingSubscription?.unsubscribe();
    this.cursorSubscription?.unsubscribe();
  }

  private startTypingProcess(): void {
    this.resetTyping();
    this.typingActive = true;
    this.typingComplete = false;
    this.startTyping();
    this.startCursor();
    this.cdr.markForCheck();
  }

  private resetTyping(): void {
    this.segmentIndex = 0;
    this.charIndexInSegment = 0;
    this.displayTextHtml = '';
    this.highlightedDisplayText = '';
    this.typingSubscription?.unsubscribe();
  }

  private startTyping(): void {
    this.typingSubscription = interval(this.typingSpeed).subscribe(() => {
      if (this.segmentIndex < this.segments.length) {
        const currentSegment = this.segments[this.segmentIndex];
        const currentChar = currentSegment.content[this.charIndexInSegment];

        if (currentSegment.content === '\n') {
          this.displayTextHtml += '<br>';
          this.segmentIndex++;
          this.charIndexInSegment = 0;
        } else {
          if (currentSegment.type === 'styled') {
            if (this.charIndexInSegment === 0) {
              this.displayTextHtml += `<span class="${currentSegment.classes}">`;
            }
            this.displayTextHtml += currentChar;
            if (this.charIndexInSegment === currentSegment.content.length - 1) {
              this.displayTextHtml += `</span>`;
            }
          } else {
            this.displayTextHtml += currentChar;
          }

          this.charIndexInSegment++;
          if (this.charIndexInSegment >= currentSegment.content.length) {
            this.segmentIndex++;
            this.charIndexInSegment = 0;
          }
        }

        this.highlightedDisplayText = this.sanitizer.bypassSecurityTrustHtml(
          this.displayTextHtml
        );
      } else {
        this.typingActive = false;
        this.typingComplete = true;
        this.typingSubscription?.unsubscribe();

        if (!this.infinite) {
          this.typingCompleteEvent.emit();
          this.stopCursor();
        } else {
          this.typingSubscription = timer(this.endDelay).subscribe(() =>
            this.startTypingProcess()
          );
        }
      }
      this.cdr.markForCheck();
    });
  }

  private startCursor(): void {
    if (this.cursorSubscription && !this.cursorSubscription.closed) {
      return;
    }
    this.showCursor = true;
    this.cursorSubscription = interval(this.cursorSpeed).subscribe(() => {
      if (
        this.typingActive ||
        (!this.typingComplete && !this.infinite) ||
        this.infinite
      ) {
        this.showCursor = !this.showCursor;
      } else {
        this.showCursor = false;
      }
      this.cdr.markForCheck();
    });
  }

  private stopCursor(): void {
    this.cursorSubscription?.unsubscribe();
    this.showCursor = false;
    this.cdr.markForCheck();
  }
}
