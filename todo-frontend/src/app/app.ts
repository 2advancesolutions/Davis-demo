import { Component } from '@angular/core';
import { TodoListComponent } from './components/todo-list/todo-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TodoListComponent],
  template: '<app-todo-list />',
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #f3f4f6;
        padding: 1rem;
        box-sizing: border-box;
      }
    `,
  ],
})
export class App {}
