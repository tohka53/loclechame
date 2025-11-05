import { Component } from '@angular/core';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-session-badge',
  templateUrl: './session-badge.component.html',
  styleUrls: ['./session-badge.component.scss']
})
export class SessionBadgeComponent {
  constructor(public session: SessionService) {}
}
