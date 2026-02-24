import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoService } from '../../services/todo.service';
import { Todo } from '../../models/todo.model';

type FilterType = 'all' | 'active' | 'completed';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.scss',
})
export class TodoListComponent implements OnInit {
  private readonly todoService = inject(TodoService);

  todos = signal<Todo[]>([]);
  filter = signal<FilterType>('all');
  newTitle = signal('');
  editingId = signal<string | null>(null);
  editingTitle = signal('');
  loading = signal(false);
  error = signal<string | null>(null);

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

  loadTodos(): void {
    this.loading.set(true);
    this.error.set(null);
    this.todoService.getAll().subscribe({
      next: (todos) => {
        this.todos.set(todos);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load todos. Please try again.');
        this.loading.set(false);
      },
    });
  }

  addTodo(): void {
    const title = this.newTitle().trim();
    if (!title) return;
    this.todoService.create({ title }).subscribe({
      next: (todo) => {
        this.todos.update((list) => [...list, todo]);
        this.newTitle.set('');
      },
      error: () => this.error.set('Failed to add todo.'),
    });
  }

  toggleComplete(todo: Todo): void {
    this.todoService.update(todo.id, { completed: !todo.completed }).subscribe({
      next: (updated) => {
        this.todos.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
      },
      error: () => this.error.set('Failed to update todo.'),
    });
  }

  startEdit(todo: Todo): void {
    this.editingId.set(todo.id);
    this.editingTitle.set(todo.title);
  }

  saveEdit(todo: Todo): void {
    const title = this.editingTitle().trim();
    if (!title) {
      this.cancelEdit();
      return;
    }
    this.todoService.update(todo.id, { title }).subscribe({
      next: (updated) => {
        this.todos.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
        this.editingId.set(null);
      },
      error: () => this.error.set('Failed to update todo.'),
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editingTitle.set('');
  }

  deleteTodo(id: string): void {
    this.todoService.delete(id).subscribe({
      next: () => this.todos.update((list) => list.filter((t) => t.id !== id)),
      error: () => this.error.set('Failed to delete todo.'),
    });
  }

  clearCompleted(): void {
    const completed = this.todos().filter((t) => t.completed);
    completed.forEach((t) => this.deleteTodo(t.id));
  }

  setFilter(f: FilterType): void {
    this.filter.set(f);
  }

  onNewTitleChange(value: string): void {
    this.newTitle.set(value);
  }

  onEditTitleChange(value: string): void {
    this.editingTitle.set(value);
  }
}
