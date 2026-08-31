import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AiReportService, AiChatResponse } from '../../../../services/ai-report.service';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  type?: 'ANSWER' | 'REPORT' | 'PDF' | 'ERROR';
  reportUrl?: string;
  metadata?: Record<string, any>;
  safeHtml?: SafeHtml;
}

@Component({
  selector: 'app-ai-reporting-assistant',
  standalone: false,
  templateUrl: './ai-reporting-assistant.component.html',
  styleUrls: ['./ai-reporting-assistant.component.css'],
})
export class AiReportingAssistantComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;
  @ViewChild('messageInputRef') private messageInputRef!: ElementRef;

  messages: ChatMessage[] = [];
  inputQuery: string = '';
  loading: boolean = false;
  downloadingPdf: boolean = false;

  currentUserRole: string = 'Manager';
  currentUserName: string = 'Manager';
  currentUserAvatarLetter: string = 'M';

  suggestedQuestions: string[] = [
    'Good morning! How are you today?',
    'What can you do for POL-KOLE?',
    'What is the least-selling beverage this month?',
    'What was our total revenue this month?',
    'Which food item sold the most this week?',
    'How can we increase takeaway sales?',
    'Compare this month sales with last month',
    'What was our busiest day?',
    'Give me a summary of today business',
    'Generate sales report with AI analysis',
  ];

  constructor(
    private readonly aiReportService: AiReportService,
    private readonly sanitizer: DomSanitizer,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Read role and user name from localStorage
    const rawRole = localStorage.getItem('role') || 'Manager';
    const cleanRole = rawRole.replace(/^ROLE_/i, '').trim();
    this.currentUserRole = cleanRole ? cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1).toLowerCase() : 'Manager';

    const savedName = localStorage.getItem('name');
    this.currentUserName = (savedName && savedName.trim()) ? savedName.trim() : this.currentUserRole;
    this.currentUserAvatarLetter = this.currentUserRole.charAt(0).toUpperCase() || 'M';

    const welcomeText = `Hello ${this.currentUserRole}! I'm your **POL-KOLE AI Reporting & Operations Assistant**.\n\nI can analyze restaurant sales, revenue trends, menu item performance, tables, and reservations in real-time, or chat about daily restaurant operations. Ask me a question below or tap any suggested prompt!`;

    this.messages.push({
      id: 'welcome-msg',
      sender: 'ai',
      text: welcomeText,
      timestamp: new Date(),
      type: 'ANSWER',
      safeHtml: this.parseMarkdown(welcomeText),
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.chatScrollContainer) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  sendPrompt(promptText?: string): void {
    const textToSend = promptText ? promptText.trim() : this.inputQuery.trim();
    if (!textToSend || this.loading) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);
    this.inputQuery = '';
    this.loading = true;
    this.cdr.detectChanges();

    this.aiReportService.sendMessage(textToSend).subscribe({
      next: (res: any) => {
        this.loading = false;
        const aiResp: AiChatResponse = res?.data ?? res;
        if (aiResp && (aiResp.message || aiResp.type)) {
          this.messages.push({
            id: 'ai_' + Date.now(),
            sender: 'ai',
            text: aiResp.message,
            timestamp: new Date(),
            type: aiResp.type || 'ANSWER',
            reportUrl: aiResp.reportUrl,
            metadata: aiResp.metadata,
            safeHtml: this.parseMarkdown(aiResp.message),
          });
        } else {
          const fallback = 'I received your query, but no specific figures matched the records.';
          this.messages.push({
            id: 'ai_' + Date.now(),
            sender: 'ai',
            text: fallback,
            timestamp: new Date(),
            type: 'ANSWER',
            safeHtml: this.parseMarkdown(fallback),
          });
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        console.error('AI chat error:', err);
        const errMsg = err?.error?.message || err?.message || 'Backend server communication failed. Please ensure the backend is running on port 8080.';
        const errText = `⚠️ **Connection Notice:** ${errMsg}`;
        this.messages.push({
          id: 'ai_err_' + Date.now(),
          sender: 'ai',
          text: errText,
          timestamp: new Date(),
          type: 'ERROR',
          safeHtml: this.parseMarkdown(errText),
        });
        this.cdr.detectChanges();
      },
    });
  }

  hasReportOrData(msg: ChatMessage): boolean {
    if (msg.reportUrl || msg.type === 'REPORT') return true;
    if (!msg.text) return false;
    const t = msg.text.toLowerCase();
    return msg.text.includes('|') || msg.text.includes('Rs.') || t.includes('revenue') || t.includes('sales') || t.includes('kottu') || t.includes('report');
  }

  downloadReportPdf(msg: ChatMessage): void {
    this.downloadingPdf = true;
    this.cdr.detectChanges();

    let startDate = msg.metadata ? msg.metadata['startDate'] : undefined;
    let endDate = msg.metadata ? msg.metadata['endDate'] : undefined;

    // If metadata not explicitly attached, infer from text
    if (!startDate && msg.text) {
      const textLower = msg.text.toLowerCase();
      const now = new Date();
      if (textLower.includes('last month')) {
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = this.formatDate(firstDay);
        endDate = this.formatDate(lastDay);
      } else if (textLower.includes('this month')) {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = this.formatDate(firstDay);
        endDate = this.formatDate(now);
      } else if (textLower.includes('today')) {
        startDate = this.formatDate(now);
        endDate = this.formatDate(now);
      }
    }

    this.aiReportService.downloadAiReportPdf(startDate, endDate).subscribe({
      next: (blob) => {
        this.downloadingPdf = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateTag = startDate ? `${startDate}_to_${endDate}` : new Date().toISOString().split('T')[0];
        a.download = `PolKole_AI_Executive_Report_${dateTag}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.downloadingPdf = false;
        console.error('Error downloading AI report PDF:', err);
        this.printAiOutput(msg);
        this.cdr.detectChanges();
      },
    });
  }

  printAiOutput(msg: ChatMessage): void {
    const printWindow = window.open('', '_blank', 'width=950,height=750');
    if (!printWindow) {
      alert('Please allow popups in your browser to print or export this AI report.');
      return;
    }

    const nowStr = new Date().toLocaleString();
    const safeHtmlContent = (msg.safeHtml as any)?.changingThisBreaksApplicationSecurity || msg.text;

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>POL-KOLE AI Reporting Briefing</title>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 18mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            line-height: 1.6;
            margin: 0;
            padding: 24px;
          }
          .header {
            border-bottom: 2.5px solid #059669;
            padding-bottom: 14px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .logo-title {
            font-size: 22px;
            font-weight: 800;
            color: #065f46;
            letter-spacing: -0.5px;
          }
          .tagline {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            font-weight: 600;
            margin-top: 3px;
          }
          .meta-box {
            font-size: 11px;
            color: #475569;
            text-align: right;
            line-height: 1.5;
          }
          .content-box {
            font-size: 13px;
            color: #334155;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 18px 0;
            font-size: 12px;
          }
          th {
            background-color: #f1f5f9;
            color: #0f172a;
            font-weight: 700;
            text-align: left;
            padding: 10px 12px;
            border: 1px solid #cbd5e1;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
          }
          td {
            padding: 9px 12px;
            border: 1px solid #e2e8f0;
            color: #1e293b;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 40px;
            padding-top: 14px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo-title">POL-KOLE RESORT & RESTAURANT</div>
            <div class="tagline">AI-Powered Business & Operational Intelligence</div>
          </div>
          <div class="meta-box">
            <div><strong>Requested By:</strong> ${this.currentUserName} (${this.currentUserRole})</div>
            <div><strong>Generated:</strong> ${nowStr}</div>
          </div>
        </div>
        <div class="content-box">
          ${safeHtmlContent}
        </div>
        <div class="footer">
          <div>POL-KOLE RMS • Confidential Executive Business Intelligence</div>
          <div>Printed from POL-KOLE AI Assistant</div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  clearChat(): void {
    this.aiReportService.resetConversation();
    this.messages = [];
    const resetText = 'Session refreshed. Ask me anything about POL-KOLE sales, menu items, revenue, table turnover, or daily operations!';
    this.messages.push({
      id: 'welcome-reset',
      sender: 'ai',
      text: resetText,
      timestamp: new Date(),
      type: 'ANSWER',
      safeHtml: this.parseMarkdown(resetText),
    });
    this.cdr.detectChanges();
  }

  parseMarkdown(text: string): SafeHtml {
    if (!text) return '';

    // Step 1: Escape raw HTML entities
    let raw = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Step 2: Parse Markdown Tables
    const lines = raw.split('\n');
    const processedLines: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|') && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        // Check for markdown table delimiter: |---|---|
        if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(nextLine)) {
          const headers = line.slice(1, -1).split('|').map((c) => c.trim());
          const sepParts = nextLine.slice(1, -1).split('|').map((c) => c.trim());
          const alignments = sepParts.map((sep) => {
            if (sep.startsWith(':') && sep.endsWith(':')) return 'text-center';
            if (sep.endsWith(':')) return 'text-right';
            return 'text-left';
          });

          const rows: string[][] = [];
          i += 2;
          while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
            const cells = lines[i].trim().slice(1, -1).split('|').map((c) => c.trim());
            rows.push(cells);
            i++;
          }

          let tableHtml = '<div class="my-4 overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-900/90 shadow-xl">';
          tableHtml += '<table class="min-w-full text-xs sm:text-sm border-collapse text-left">';
          tableHtml += '<thead><tr class="bg-gradient-to-r from-slate-800 to-slate-850 border-b border-slate-700/90 text-emerald-400 font-bold tracking-wider uppercase text-[11px]">';
          headers.forEach((h, idx) => {
            const align = alignments[idx] || 'text-left';
            tableHtml += `<th class="px-4 py-3 ${align} whitespace-nowrap">${h}</th>`;
          });
          tableHtml += '</tr></thead><tbody class="divide-y divide-slate-800/80">';
          rows.forEach((row, rIdx) => {
            const zebra = rIdx % 2 === 1 ? 'bg-slate-800/30' : 'bg-transparent';
            tableHtml += `<tr class="${zebra} hover:bg-emerald-500/10 transition-colors">`;
            row.forEach((cell, cIdx) => {
              let align = alignments[cIdx] || 'text-left';
              if (/^Rs\.?\s?[0-9,]+(?:\.[0-9]{2})?$/.test(cell)) align = 'text-right';
              else if (/^[0-9]+(?:\.[0-9]+)?\s?%$/.test(cell)) align = 'text-center';
              tableHtml += `<td class="px-4 py-2.5 text-slate-200 ${align} whitespace-nowrap font-medium">${cell}</td>`;
            });
            tableHtml += '</tr>';
          });
          tableHtml += '</tbody></table></div>';
          processedLines.push(tableHtml);
          continue;
        }
      }
      processedLines.push(lines[i]);
      i++;
    }

    let html = processedLines.join('\n');

    // Step 3: Markdown Headings
    html = html.replace(/###\s+(.+)/g, '<h4 class="text-sm font-bold text-emerald-400 mt-3 mb-1">$1</h4>');
    html = html.replace(/##\s+(.+)/g, '<h3 class="text-base font-bold text-emerald-400 mt-3 mb-1.5">$1</h3>');
    html = html.replace(/#\s+(.+)/g, '<h2 class="text-lg font-bold text-emerald-400 mt-4 mb-2">$1</h2>');

    // Clean title for section headers like "Kottu Sales – Last Month"
    html = html.replace(/^([A-Za-z0-9\s&–-]+–\s+[A-Za-z0-9\s]+)(?=\n|$)/m, '<div class="text-base font-bold text-emerald-400 mb-2 pb-1 border-b border-slate-700/50">$1</div>');

    // Step 4: Bold **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-emerald-400">$1</strong>');

    // Step 5: Italic *text*
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic text-slate-300">$1</em>');

    // Step 6: Currency badge (e.g. Rs. 12,500.00 or Rs. 1,000)
    html = html.replace(/(Rs\.?\s?[0-9,]+(?:\.[0-9]{2})?)/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">$1</span>');

    // Step 7: Percentage highlights
    html = html.replace(/([+-]?[0-9]+(?:\.[0-9]+)?\s?%)/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-teal-950/80 text-teal-300 border border-teal-700/60">$1</span>');

    // Step 8: Bullet points (lines starting with • or -)
    html = html.replace(/(?:^|\n)\s*[-•]\s+(.+)/g, '<div class="flex items-start gap-2 my-1.5"><span class="text-emerald-500 font-bold mt-0.5">•</span><span class="text-slate-200">$1</span></div>');

    // Step 9: Numbered points (e.g. 1. 2. 3.)
    html = html.replace(/(?:^|\n)\s*([0-9]+)\.\s+(.+)/g, '<div class="flex items-start gap-2 my-1.5"><span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">$1</span><span class="text-slate-200">$2</span></div>');

    // Step 10: Convert newlines (avoid breaking table structure)
    const parts = html.split(/(<div[\s\S]*?<\/div>)/g);
    for (let p = 0; p < parts.length; p++) {
      if (!parts[p].startsWith('<div')) {
        parts[p] = parts[p].replace(/\n/g, '<br/>');
      }
    }
    html = parts.join('');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
