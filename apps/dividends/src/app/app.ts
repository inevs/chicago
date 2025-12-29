import { Component } from '@angular/core';
import { MainLayoutComponent } from './components/layout/main-layout/main-layout.component';

@Component({
  imports: [MainLayoutComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'dividends';
}
