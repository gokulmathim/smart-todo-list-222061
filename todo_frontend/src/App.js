import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "retro_todos_v1";
const THEME_KEY = "retro_theme_v1";

function generateId() {
  // Reasonably collision-resistant for local-only IDs without extra deps.
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Load todos from localStorage, falling back to an empty list.
 * Not exported (internal helper).
 */
function loadTodos() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Minimal validation / normalization
    return parsed
      .filter((t) => t && typeof t === "object")
      .map((t) => ({
        id: typeof t.id === "string" ? t.id : generateId(),
        title: typeof t.title === "string" ? t.title : "",
        completed: Boolean(t.completed),
        createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
        updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : Date.now(),
      }))
      .filter((t) => t.title.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * Load theme from localStorage, defaulting to "light".
 * Not exported (internal helper).
 */
function loadTheme() {
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    return raw === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/**
 * Persist todos to localStorage.
 * Not exported (internal helper).
 */
function saveTodos(todos) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // Ignore persistence errors (e.g., storage quota, privacy mode).
  }
}

/**
 * Persist theme to localStorage.
 * Not exported (internal helper).
 */
function saveTheme(theme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore.
  }
}

// PUBLIC_INTERFACE
function App() {
  /**
   * Filter can be: "all" | "active" | "completed"
   */
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState(() => loadTheme());

  const [todos, setTodos] = useState(() => loadTodos());

  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const [error, setError] = useState("");

  const newInputRef = useRef(null);
  const editInputRef = useRef(null);

  // Apply theme to document root (attribute based theme).
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

  // Persist todos whenever they change.
  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  // Focus management for editing mode.
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const active = total - completed;
    return { total, active, completed };
  }, [todos]);

  const visibleTodos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return todos
      .filter((t) => {
        if (filter === "active") return !t.completed;
        if (filter === "completed") return t.completed;
        return true;
      })
      .filter((t) => {
        if (!q) return true;
        return t.title.toLowerCase().includes(q);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [todos, filter, query]);

  const hasCompleted = stats.completed > 0;
  const hasAnyTodos = stats.total > 0;

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  function clearErrorSoon() {
    window.setTimeout(() => setError(""), 2500);
  }

  function validateTitle(title) {
    if (title.trim().length === 0) return "Please type a todo first.";
    if (title.trim().length > 140) return "Keep it short (max 140 characters).";
    return "";
  }

  // PUBLIC_INTERFACE
  function addTodo(e) {
    e.preventDefault();
    const message = validateTitle(newTitle);
    if (message) {
      setError(message);
      clearErrorSoon();
      return;
    }

    const now = Date.now();
    const todo = {
      id: generateId(),
      title: newTitle.trim(),
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    setTodos((prev) => [todo, ...prev]);
    setNewTitle("");
    setError("");
    if (newInputRef.current) newInputRef.current.focus();
  }

  // PUBLIC_INTERFACE
  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t
      )
    );
  }

  // PUBLIC_INTERFACE
  function deleteTodo(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditingTitle("");
    }
  }

  // PUBLIC_INTERFACE
  function startEdit(todo) {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
    setError("");
  }

  // PUBLIC_INTERFACE
  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
    setError("");
  }

  // PUBLIC_INTERFACE
  function saveEdit(id) {
    const message = validateTitle(editingTitle);
    if (message) {
      setError(message);
      clearErrorSoon();
      return;
    }

    const title = editingTitle.trim();
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title, updatedAt: Date.now() } : t))
    );
    setEditingId(null);
    setEditingTitle("");
    setError("");
  }

  // PUBLIC_INTERFACE
  function markAllCompleted() {
    const now = Date.now();
    setTodos((prev) => prev.map((t) => ({ ...t, completed: true, updatedAt: now })));
  }

  // PUBLIC_INTERFACE
  function markAllActive() {
    const now = Date.now();
    setTodos((prev) => prev.map((t) => ({ ...t, completed: false, updatedAt: now })));
  }

  // PUBLIC_INTERFACE
  function clearCompleted() {
    setTodos((prev) => prev.filter((t) => !t.completed));
  }

  function onKeyDownInEdit(e, id) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit(id);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  }

  return (
    <div className="App">
      <div className="appShell">
        <header className="topBar">
          <div className="brand">
            <div className="brandMark" aria-hidden="true">
              RT
            </div>
            <div className="brandText">
              <h1 className="title">Retro Todo Terminal</h1>
              <p className="subtitle">CRUD • Filters • Local persistence • Responsive</p>
            </div>
          </div>

          <button
            className="btn btnGhost"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title="Toggle theme"
          >
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
        </header>

        <main className="container">
          <section className="panel" aria-label="Todo composer">
            <form className="composer" onSubmit={addTodo}>
              <label className="srOnly" htmlFor="newTodo">
                Add a new todo
              </label>
              <input
                id="newTodo"
                ref={newInputRef}
                className="input"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder='Type a mission... e.g. "Refactor flux capacitor"'
                maxLength={140}
                autoComplete="off"
              />
              <button className="btn btnPrimary" type="submit">
                Add
              </button>
            </form>

            <div className="controls">
              <div className="filters" role="tablist" aria-label="Todo filters">
                <button
                  type="button"
                  className={`chip ${filter === "all" ? "chipActive" : ""}`}
                  onClick={() => setFilter("all")}
                  aria-pressed={filter === "all"}
                >
                  All <span className="chipCount">{stats.total}</span>
                </button>
                <button
                  type="button"
                  className={`chip ${filter === "active" ? "chipActive" : ""}`}
                  onClick={() => setFilter("active")}
                  aria-pressed={filter === "active"}
                >
                  Active <span className="chipCount">{stats.active}</span>
                </button>
                <button
                  type="button"
                  className={`chip ${filter === "completed" ? "chipActive" : ""}`}
                  onClick={() => setFilter("completed")}
                  aria-pressed={filter === "completed"}
                >
                  Done <span className="chipCount">{stats.completed}</span>
                </button>
              </div>

              <div className="search">
                <label className="srOnly" htmlFor="searchTodos">
                  Search todos
                </label>
                <input
                  id="searchTodos"
                  className="input inputSmall"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                />
              </div>
            </div>

            <div className="bulkActions" aria-label="Bulk actions">
              <button
                type="button"
                className="btn btnSecondary"
                onClick={markAllCompleted}
                disabled={!hasAnyTodos || stats.active === 0}
              >
                Mark all done
              </button>
              <button
                type="button"
                className="btn btnSecondary"
                onClick={markAllActive}
                disabled={!hasAnyTodos || stats.completed === 0}
              >
                Mark all active
              </button>
              <button
                type="button"
                className="btn btnDanger"
                onClick={clearCompleted}
                disabled={!hasCompleted}
              >
                Clear done
              </button>
            </div>

            {error ? (
              <div className="toast" role="status" aria-live="polite">
                {error}
              </div>
            ) : null}
          </section>

          <section className="panel" aria-label="Todo list">
            {visibleTodos.length === 0 ? (
              <div className="emptyState">
                <p className="emptyTitle">No signal found.</p>
                <p className="emptyHint">
                  {stats.total === 0
                    ? "Add your first todo above."
                    : "Try changing filter/search."}
                </p>
              </div>
            ) : (
              <ul className="list" aria-label="Todos">
                {visibleTodos.map((todo) => {
                  const isEditing = editingId === todo.id;
                  return (
                    <li
                      key={todo.id}
                      className={`item ${todo.completed ? "itemDone" : ""}`}
                    >
                      <div className="itemLeft">
                        <input
                          id={`toggle_${todo.id}`}
                          className="checkbox"
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => toggleTodo(todo.id)}
                          aria-label={`Mark "${todo.title}" as ${
                            todo.completed ? "active" : "done"
                          }`}
                        />

                        {isEditing ? (
                          <div className="editArea">
                            <label className="srOnly" htmlFor={`edit_${todo.id}`}>
                              Edit todo title
                            </label>
                            <input
                              id={`edit_${todo.id}`}
                              ref={editInputRef}
                              className="input"
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => onKeyDownInEdit(e, todo.id)}
                              maxLength={140}
                              autoComplete="off"
                            />
                            <div className="editActions">
                              <button
                                type="button"
                                className="btn btnPrimary"
                                onClick={() => saveEdit(todo.id)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="btn btnGhost"
                                onClick={cancelEdit}
                              >
                                Cancel
                              </button>
                            </div>
                            <p className="editHint">Enter to save • Esc to cancel</p>
                          </div>
                        ) : (
                          <label className="itemTitle" htmlFor={`toggle_${todo.id}`}>
                            {todo.title}
                          </label>
                        )}
                      </div>

                      {!isEditing ? (
                        <div className="itemRight">
                          <button
                            type="button"
                            className="btn btnGhost"
                            onClick={() => startEdit(todo)}
                            aria-label={`Edit "${todo.title}"`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btnDanger"
                            onClick={() => deleteTodo(todo.id)}
                            aria-label={`Delete "${todo.title}"`}
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            <footer className="footer">
              <div className="footerLine">
                <span className="badge" aria-label="Active todo count">
                  Active: {stats.active}
                </span>
                <span className="badge" aria-label="Completed todo count">
                  Done: {stats.completed}
                </span>
                <span className="badge" aria-label="Total todo count">
                  Total: {stats.total}
                </span>
              </div>
              <div className="footerHelp">
                Tips: double-click “Edit” is not required — use the Edit button. Data
                stays on this device via localStorage.
              </div>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
