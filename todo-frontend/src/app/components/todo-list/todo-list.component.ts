import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TodoService } from '../../services/todo.service';
import { Todo } from '../../models/todo.model';

type Filter = 'all' | 'active' | 'completed';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.scss',
})
export class TodoListComponent implements OnInit {
  private readonly todoService = inject(TodoService);

  // State
  todos = signal<Todo[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  newTitle = signal('');
  filter = signal<Filter>('all');
  editingId = signal<string | null>(null);
  editingTitle = signal('');

  // Derived
  filteredTodos = computed(() => {
    const f = this.filter();
    return this.todos().filter((t) => {
      if (f === 'active') return !t.completed;
      if (f === 'completed') return t.completed;
      return true;
    });
  });

  activeCount = computed(() => this.todos().filter((t) => !t.completed).length);

  ngOnInit(): void {
    this.loadTodos();
  }

  private loadTodos(): void {
    this.loading.set(true);
    this.todoService.getAll().subscribe({
      next: (todos) => {
        this.todos.set(todos);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load todos. Is the backend running?');
        console.error(err);
        this.loading.set(false);
      },
    });
  }

  onNewTitleChange(value: string): void {
    this.newTitle.set(value);
  }

  addTodo(): void {
    const title = this.newTitle().trim();
    if (!title) return;

    this.todoService.create({ title }).subscribe({
      next: (todo) => {
        this.todos.update((list) => [...list, todo]);
        this.newTitle.set('');
      },
      error: (err) => {
        this.error.set('Failed to create todo.');
        console.error(err);
      },
    });
  }

  toggleComplete(todo: Todo): void {
    this.todoService.update(todo.id, { completed: !todo.completed }).subscribe({
      next: (updated) => {
        this.todos.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
      },
      error: (err) => {
        this.error.set('Failed to update todo.');
        console.error(err);
      },
    });
  }

  startEdit(todo: Todo): void {
    this.editingId.set(todo.id);
    this.editingTitle.set(todo.title);
  }

  onEditTitleChange(value: string): void {
    this.editingTitle.set(value);
  }

  saveEdit(todo: Todo): void {
    const title = this.editingTitle().trim();
    if (!title || title === todo.title) {
      this.cancelEdit();
      return;
    }

    this.todoService.update(todo.id, { title }).subscribe({
      next: (updated) => {
        this.todos.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
        this.editingId.set(null);
      },
      error: (err) => {
        this.error.set('Failed to update todo.');
        console.error(err);
      },
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editingTitle.set('');
  }

  deleteTodo(id: string): void {
    this.todoService.delete(id).subscribe({
      next: () => {
        this.todos.update((list) => list.filter((t) => t.id !== id));
      },
      error: (err) => {
        this.error.set('Failed to delete todo.');
        console.error(err);
      },
    });
  }

  setFilter(f: Filter): void {
    this.filter.set(f);
  }

  clearCompleted(): void {
    const completed = this.todos().filter((t) => t.completed);
    completed.forEach((todo) => this.deleteTodo(todo.id));
  }
}
