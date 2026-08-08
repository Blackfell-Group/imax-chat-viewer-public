import { Component, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { TriagePanel } from './features/triage/triage-panel';
import { ChatViewer } from './features/viewer/chat-viewer';
import { GoldCopyPanel } from './features/gold-copy/gold-copy-panel';
import { IdentityService } from './core/services/identity-service';

@Component({
  selector: 'app-root',
  imports: [MatToolbarModule, MatIconModule, TriagePanel, ChatViewer, GoldCopyPanel],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Whoever the front says is signed in — shown in the toolbar and stamped on
  // the notes they write. The SPA authenticates nobody; it reports.
  protected readonly identity = inject(IdentityService);
}
