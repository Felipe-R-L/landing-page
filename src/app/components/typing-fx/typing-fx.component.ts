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

// Interface para representar os segmentos do texto
interface Segment {
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
  @Input() text: string = '';
  @Input() typingSpeed: number = 100;
  @Input() cursorChar: string = '|';
  @Input() cursorSpeed: number = 500;
  @Input() infinite: boolean = false;
  @Input() initialDelay: number = 0;
  @Input() endDelay: number = 1500;
  @Input() cursorOffsetBottom: number = 0; // Mantendo se você adicionou na etapa anterior

  @Output() typingCompleteEvent = new EventEmitter<void>();

  highlightedDisplayText: SafeHtml = '';
  showCursor: boolean = true;
  typingActive: boolean = false;
  typingComplete: boolean = false;

  // Novo: Array para armazenar os segmentos pré-processados
  private parsedSegments: Segment[] = [];
  // Novo: Índices para controlar a posição nos segmentos
  private segmentIndex: number = 0;
  private charIndexInSegment: number = 0;
  // Novo: String para construir o HTML progressivamente
  private displayTextHtml: string = '';

  private typingSubscription: Subscription | undefined;
  private cursorSubscription: Subscription | undefined;
  private initialDelaySubscription: Subscription | undefined;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Pré-processa o texto ao inicializar
    this.parsedSegments = this.parseInputText(this.text);

    // Inicia a digitação (com ou sem delay)
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

  // --- Nova Função de Parse ---
  private parseInputText(text: string): Segment[] {
    const segments: Segment[] = [];
    // Regex para encontrar os marcadores [texto]{classes}
    const markerRegex = /\[(.*?)\]\{(.*?)\}/g;
    let lastIndex = 0;
    let match;

    while ((match = markerRegex.exec(text)) !== null) {
      // 1. Adiciona o texto simples ANTES do marcador (se houver)
      if (match.index > lastIndex) {
        segments.push({
          type: 'plain',
          content: text.substring(lastIndex, match.index),
        });
      }
      // 2. Adiciona o segmento ESTILIZADO
      segments.push({
        type: 'styled',
        content: match[1],
        classes: match[2].trim(),
      });
      lastIndex = markerRegex.lastIndex; // Atualiza o índice para a próxima busca
    }

    // 3. Adiciona o texto simples restante DEPOIS do último marcador (se houver)
    if (lastIndex < text.length) {
      segments.push({ type: 'plain', content: text.substring(lastIndex) });
    }

    // 4. Refinamento: Quebra segmentos que contêm \n em múltiplos segmentos
    const finalSegments: Segment[] = [];
    segments.forEach((segment) => {
      // Quebra o conteúdo do segmento por '\n'
      const lines = segment.content.split('\n');
      lines.forEach((line, index) => {
        // Adiciona o segmento da linha (se não estiver vazia)
        if (line.length > 0) {
          // Cria um novo segmento com o mesmo tipo/classes, mas só com o conteúdo da linha
          finalSegments.push({ ...segment, content: line });
        }
        // Adiciona um segmento 'plain' para a quebra de linha em si, exceto após a última parte
        if (index < lines.length - 1) {
          finalSegments.push({ type: 'plain', content: '\n' });
        }
      });
    });

    // console.log("Parsed Segments:", finalSegments); // Descomente para depurar
    return finalSegments;
  }
  // --- Fim da Função de Parse ---

  private startTypingProcess(): void {
    this.resetTyping();
    this.typingActive = true;
    this.typingComplete = false;
    this.startTyping(); // Inicia a nova lógica de digitação
    this.startCursor();
    this.cdr.markForCheck();
  }

  // Atualizado para resetar os novos índices
  private resetTyping(): void {
    this.segmentIndex = 0;
    this.charIndexInSegment = 0;
    this.displayTextHtml = ''; // Reseta o HTML acumulado
    this.highlightedDisplayText = ''; // Reseta o SafeHtml
    this.typingSubscription?.unsubscribe();
  }

  // --- Lógica Principal de Digitação Refatorada ---
  private startTyping(): void {
    this.typingSubscription = interval(this.typingSpeed).subscribe(() => {
      // Verifica se ainda há segmentos para processar
      if (this.segmentIndex < this.parsedSegments.length) {
        const currentSegment = this.parsedSegments[this.segmentIndex];
        const currentChar = currentSegment.content[this.charIndexInSegment];

        // Tratamento especial para quebra de linha
        if (currentSegment.content === '\n') {
          this.displayTextHtml += '<br>';
          // Avança para o próximo segmento (pois \n é um segmento próprio)
          this.segmentIndex++;
          this.charIndexInSegment = 0;
        } else {
          // Lógica para segmentos 'plain' e 'styled'
          if (currentSegment.type === 'styled') {
            // Adiciona a tag span no início do segmento estilizado
            if (this.charIndexInSegment === 0) {
              this.displayTextHtml += `<span class="${currentSegment.classes}">`;
            }
            // Adiciona o caractere atual (escapar se necessário, mas aqui parece seguro)
            this.displayTextHtml += currentChar;
            // Adiciona a tag span no final do segmento estilizado
            if (this.charIndexInSegment === currentSegment.content.length - 1) {
              this.displayTextHtml += `</span>`;
            }
          } else {
            // type === 'plain'
            // Adiciona o caractere simples
            this.displayTextHtml += currentChar;
          }

          // Avança para o próximo caractere ou segmento
          this.charIndexInSegment++;
          if (this.charIndexInSegment >= currentSegment.content.length) {
            this.segmentIndex++;
            this.charIndexInSegment = 0;
          }
        }

        // Atualiza o SafeHtml para o template
        this.highlightedDisplayText = this.sanitizer.bypassSecurityTrustHtml(
          this.displayTextHtml
        );
      } else {
        // --- Digitação Completa ---
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
      this.cdr.markForCheck(); // Notifica o Angular
    });
  }
  // --- Fim da Lógica Refatorada ---

  // Funções startCursor, stopCursor e getHighlightedHtml (esta última não é mais usada diretamente na digitação) permanecem semelhantes
  // Exceto que getHighlightedHtml não é mais necessária dentro do loop de digitação.
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

  // Esta função não é mais central para a digitação, mas pode ser útil para outros fins se necessário
  // private getHighlightedHtml(text: string): SafeHtml { ... }
}
