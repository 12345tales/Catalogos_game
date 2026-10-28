type GameStatus = "played" | "pending";
type StatusFilter = "all" | GameStatus;
type SortMode = "recent" | "title" | "year-desc" | "year-asc";

interface Game {
  id: number;
  title: string;
  category: string;
  releaseYear: number;
  status: GameStatus;
  image: string;
  createdAt: number;
}

interface FeaturedGame {
  title: string;
  category: string;
  releaseYear: number;
  image: string;
  description: string;
  accent: string;
}

const STORAGE_KEY = "gameshelf.library.v1";
const currentYear = new Date().getFullYear();
const categories = ["Ação", "Aventura", "Esporte", "Estratégia", "RPG", "Simulação", "Terror", "Outro"] as const;
const featuredGames: FeaturedGame[] = [
  { title: "Grand Theft Auto V", category: "Ação", releaseYear: 2013, image: "/images/gta-v.svg", description: "Uma cidade aberta cheia de possibilidades.", accent: "violet" },
  { title: "Minecraft", category: "Aventura", releaseYear: 2011, image: "/images/minecraft.svg", description: "Construa, explore e crie seu próprio mundo.", accent: "green" },
  { title: "Fortnite", category: "Ação", releaseYear: 2017, image: "/images/fortnite.svg", description: "Estratégia, ação e criatividade em uma arena.", accent: "blue" },
  { title: "The Legend of Zelda: Breath of the Wild", category: "Aventura", releaseYear: 2017, image: "/images/zelda.svg", description: "Explore um reino e descubra novas histórias.", accent: "gold" },
];

let games: Game[] = loadGames();
let nextId = games.reduce((maximum, game) => Math.max(maximum, game.id), 0) + 1;
let editingGameId: number | null = null;
let activeStatusFilter: StatusFilter = "all";
let toastTimer: number | undefined;

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Não foi possível encontrar o elemento HTML com id "${id}".`);
  return element as T;
}

const gameForm = getElement<HTMLFormElement>("game-form");
const titleInput = getElement<HTMLInputElement>("title");
const imageInput = getElement<HTMLInputElement>("image");
const categoryInput = getElement<HTMLSelectElement>("category");
const yearInput = getElement<HTMLInputElement>("release-year");
const statusInput = getElement<HTMLSelectElement>("status");
const formMessage = getElement<HTMLDivElement>("form-message");
const formHeading = getElement<HTMLHeadingElement>("form-heading");
const submitButton = getElement<HTMLButtonElement>("submit-button");
const cancelEditButton = getElement<HTMLButtonElement>("cancel-edit");
const searchInput = getElement<HTMLInputElement>("search-input");
const clearSearchButton = getElement<HTMLButtonElement>("clear-search");
const categoryFilter = getElement<HTMLSelectElement>("category-filter");
const sortSelect = getElement<HTMLSelectElement>("sort-select");
const catalogList = getElement<HTMLDivElement>("catalog-list");
const emptyState = getElement<HTMLDivElement>("empty-state");
const emptyTitle = getElement<HTMLHeadingElement>("empty-title");
const emptyDescription = getElement<HTMLParagraphElement>("empty-description");
const totalCount = getElement<HTMLParagraphElement>("total-count");
const playedCount = getElement<HTMLParagraphElement>("played-count");
const pendingCount = getElement<HTMLParagraphElement>("pending-count");
const visibleCount = getElement<HTMLSpanElement>("visible-count");
const catalogFooterText = getElement<HTMLSpanElement>("catalog-footer-text");
const progressPercent = getElement<HTMLParagraphElement>("progress-percent");
const progressBar = getElement<HTMLSpanElement>("progress-bar");
const progressCaption = getElement<HTMLParagraphElement>("progress-caption");
const filterTotal = getElement<HTMLSpanElement>("filter-total");
const featuredGrid = getElement<HTMLDivElement>("featured-grid");
const imagePreviewContainer = getElement<HTMLDivElement>("image-preview-container");
const imagePreview = getElement<HTMLImageElement>("image-preview");
const imagePreviewName = getElement<HTMLSpanElement>("image-preview-name");
const removeImageButton = getElement<HTMLButtonElement>("remove-image");
const exportButton = getElement<HTMLButtonElement>("export-button");
const importButton = getElement<HTMLButtonElement>("import-button");
const importFileInput = getElement<HTMLInputElement>("import-file");
const clearLibraryButton = getElement<HTMLButtonElement>("clear-library-button");
const toastRegion = getElement<HTMLDivElement>("toast-region");

function loadGames(): Game[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    const rawGames = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.games) ? parsed.games : [];
    const loaded: Game[] = [];
    const usedTitles = new Set<string>();
    rawGames.forEach((raw: unknown, index: number) => {
      const game = normalizeGame(raw, index + 1);
      if (!game) return;
      const key = game.title.toLocaleLowerCase("pt-BR");
      if (usedTitles.has(key)) return;
      usedTitles.add(key);
      loaded.push(game);
    });
    return loaded;
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeGame(raw: unknown, fallbackId: number): Game | null {
  if (!isRecord(raw)) return null;
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 80) : "";
  const category = typeof raw.category === "string" ? raw.category : "Outro";
  const releaseYear = Number(raw.releaseYear);
  const status: GameStatus = raw.status === "played" ? "played" : "pending";
  const rawImage = typeof raw.image === "string" ? raw.image.trim() : "";
  const image = safeImageSource(rawImage);
  if (!title || !categories.includes(category as (typeof categories)[number])) return null;
  if (!Number.isInteger(releaseYear) || releaseYear < 1950 || releaseYear > currentYear + 5) return null;
  if (rawImage && image === null) return null;
  const rawId = Number(raw.id);
  const rawCreatedAt = Number(raw.createdAt);
  return {
    id: Number.isSafeInteger(rawId) && rawId > 0 ? rawId : fallbackId,
    title,
    category,
    releaseYear,
    status,
    image: image ?? "",
    createdAt: Number.isFinite(rawCreatedAt) && rawCreatedAt > 0 ? rawCreatedAt : Date.now() + fallbackId,
  };
}

function saveGames(): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, games }));
    return true;
  } catch {
    showToast("Não foi possível salvar. Verifique o espaço disponível no navegador.", "error");
    return false;
  }
}

function showMessage(message: string, type: "error" | "success"): void {
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`;
}

function clearMessage(): void {
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

function showToast(message: string, type: "success" | "error" = "success"): void {
  window.clearTimeout(toastTimer);
  toastRegion.replaceChildren();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.textContent = type === "success" ? "✓" : "!";
  const text = document.createElement("span");
  text.textContent = message;
  toast.append(icon, text);
  toastRegion.appendChild(toast);
  toastTimer = window.setTimeout(() => toast.remove(), 3800);
}

function safeImageSource(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/images/") && !trimmed.includes("..") && !trimmed.includes("\\")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {
    return null;
  }
  return null;
}

function validateGame(title: string, category: string, year: number, image: string): string | null {
  if (!title.trim()) return "Informe o nome do jogo.";
  if (title.trim().length > 80) return "O nome do jogo deve ter no máximo 80 caracteres.";
  if (!categories.includes(category as (typeof categories)[number])) return "Selecione uma categoria válida.";
  if (!Number.isFinite(year) || !Number.isInteger(year)) return "O ano deve ser um número inteiro válido.";
  if (year < 1950 || year > currentYear + 5) return `Informe um ano entre 1950 e ${currentYear + 5}.`;
  if (image.trim() && safeImageSource(image) === null) return "A capa deve usar uma URL HTTP/HTTPS válida ou um caminho como /images/capa.svg.";
  const duplicateExists = games.some((game) => game.title.toLocaleLowerCase("pt-BR") === title.trim().toLocaleLowerCase("pt-BR") && game.id !== editingGameId);
  if (duplicateExists) return "Já existe um jogo com esse nome na biblioteca.";
  return null;
}

function categoryGlyph(category: string): string {
  const glyphs: Record<string, string> = {
    "Ação": "✹", "Aventura": "⚔", "Esporte": "⚽", "Estratégia": "♟",
    "RPG": "✧", "Simulação": "⌘", "Terror": "☾", "Outro": "✦",
  };
  return glyphs[category] ?? "✦";
}

function getFilteredGames(): Game[] {
  const searchTerm = searchInput.value.trim().toLocaleLowerCase("pt-BR");
  const selectedCategory = categoryFilter.value;
  const selectedStatus = activeStatusFilter;
  const result = games.filter((game) => {
    const matchesName = game.title.toLocaleLowerCase("pt-BR").includes(searchTerm);
    const matchesCategory = selectedCategory === "" || game.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || game.status === selectedStatus;
    return matchesName && matchesCategory && matchesStatus;
  });
  const mode = sortSelect.value as SortMode;
  return result.sort((a, b) => {
    if (mode === "title") return a.title.localeCompare(b.title, "pt-BR");
    if (mode === "year-desc") return b.releaseYear - a.releaseYear || a.title.localeCompare(b.title, "pt-BR");
    if (mode === "year-asc") return a.releaseYear - b.releaseYear || a.title.localeCompare(b.title, "pt-BR");
    return b.createdAt - a.createdAt;
  });
}

function createGameCard(game: Game, index: number): HTMLElement {
  const card = document.createElement("article");
  card.className = "game-card";
  card.dataset.gameId = String(game.id);

  const cover = document.createElement("div");
  cover.className = `game-cover cover-${(index % 4) + 1}`;
  const fallback = document.createElement("div");
  fallback.className = "cover-fallback";
  const glyph = document.createElement("span");
  glyph.className = "cover-glyph";
  glyph.textContent = categoryGlyph(game.category);
  const fallbackTitle = document.createElement("span");
  fallbackTitle.className = "cover-fallback-title";
  fallbackTitle.textContent = game.title;
  fallback.append(glyph, fallbackTitle);
  cover.appendChild(fallback);

  if (game.image) {
    const image = document.createElement("img");
    image.className = "game-cover-image";
    image.src = game.image;
    image.alt = `Capa de ${game.title}`;
    image.loading = "lazy";
    image.addEventListener("load", () => cover.classList.add("has-image"));
    image.addEventListener("error", () => {
      image.remove();
      cover.classList.remove("has-image");
    });
    cover.appendChild(image);
  }

  const info = document.createElement("div");
  info.className = "game-info";
  const title = document.createElement("h3");
  title.className = "game-title";
  title.textContent = game.title;
  title.title = game.title;
  const meta = document.createElement("div");
  meta.className = "game-meta";
  const categoryTag = document.createElement("span");
  categoryTag.className = "category-tag";
  categoryTag.textContent = game.category;
  const yearText = document.createElement("span");
  yearText.className = "year-tag";
  yearText.textContent = String(game.releaseYear);
  meta.append(categoryTag, yearText);
  const statusTag = document.createElement("span");
  statusTag.className = `status-tag ${game.status === "played" ? "status-played" : "status-pending"}`;
  statusTag.textContent = game.status === "played" ? "✓ Já joguei" : "◷ Quero jogar";
  info.append(title, meta, statusTag);

  const actions = document.createElement("div");
  actions.className = "game-actions";
  const statusButton = makeActionButton(game.status === "played" ? "↺" : "✓", game.status === "played" ? "Marcar como quero jogar" : "Marcar como já joguei", `Alterar situação de ${game.title}`, () => toggleGameStatus(game.id));
  const editButton = makeActionButton("✎", "Editar jogo", `Editar ${game.title}`, () => startEditing(game.id));
  const deleteButton = makeActionButton("⌫", "Excluir jogo", `Excluir ${game.title}`, () => deleteGame(game.id));
  deleteButton.classList.add("delete");
  actions.append(statusButton, editButton, deleteButton);
  card.append(cover, info, actions);
  return card;
}

function makeActionButton(symbol: string, title: string, ariaLabel: string, action: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.textContent = symbol;
  button.title = title;
  button.setAttribute("aria-label", ariaLabel);
  button.addEventListener("click", action);
  return button;
}

function renderFeatured(): void {
  featuredGrid.replaceChildren();
  featuredGames.forEach((featured, index) => {
    const card = document.createElement("article");
    card.className = `featured-card featured-${featured.accent}`;
    const imageWrap = document.createElement("div");
    imageWrap.className = "featured-image-wrap";
    const image = document.createElement("img");
    image.src = featured.image;
    image.alt = `Arte ilustrativa para ${featured.title}`;
    image.loading = index > 1 ? "lazy" : "eager";
    imageWrap.appendChild(image);
    const shade = document.createElement("div");
    shade.className = "featured-shade";
    const body = document.createElement("div");
    body.className = "featured-body";
    const tag = document.createElement("span");
    tag.className = "featured-tag";
    tag.textContent = featured.category.toLocaleUpperCase("pt-BR");
    const title = document.createElement("h3");
    title.textContent = featured.title;
    const description = document.createElement("p");
    description.textContent = featured.description;
    const footer = document.createElement("div");
    footer.className = "featured-footer";
    const year = document.createElement("span");
    year.textContent = String(featured.releaseYear);
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "featured-add";
    const existing = games.some((game) => game.title.toLocaleLowerCase("pt-BR") === featured.title.toLocaleLowerCase("pt-BR"));
    addButton.textContent = existing ? "✓ Na biblioteca" : "+ Adicionar";
    addButton.disabled = existing;
    addButton.setAttribute("aria-label", existing ? `${featured.title} já está na biblioteca` : `Adicionar ${featured.title} à biblioteca`);
    addButton.addEventListener("click", () => addFeaturedGame(featured));
    footer.append(year, addButton);
    body.append(tag, title, description, footer);
    card.append(imageWrap, shade, body);
    featuredGrid.appendChild(card);
  });
}

function renderCatalog(): void {
  const filteredGames = getFilteredGames();
  catalogList.replaceChildren();
  filteredGames.forEach((game, index) => catalogList.appendChild(createGameCard(game, index)));

  const noGamesAtAll = games.length === 0;
  const noSearchResults = !noGamesAtAll && filteredGames.length === 0;
  emptyState.classList.toggle("hidden", filteredGames.length > 0);
  catalogList.classList.toggle("hidden", filteredGames.length === 0);
  if (noGamesAtAll) {
    emptyTitle.textContent = "Sua próxima aventura começa aqui";
    emptyDescription.textContent = "Adicione seu primeiro jogo pelo formulário ou escolha uma sugestão em destaque.";
  } else if (noSearchResults) {
    emptyTitle.textContent = "Nenhum jogo encontrado";
    emptyDescription.textContent = "Tente mudar a busca, a categoria ou o filtro de situação.";
  }

  visibleCount.textContent = String(filteredGames.length);
  filterTotal.textContent = String(games.length);
  catalogFooterText.textContent = `Mostrando ${filteredGames.length} ${filteredGames.length === 1 ? "jogo" : "jogos"}`;
  clearSearchButton.classList.toggle("hidden", searchInput.value.length === 0);
  updateSummary();
}

function updateSummary(): void {
  const playedTotal = games.filter((game) => game.status === "played").length;
  const pendingTotal = games.length - playedTotal;
  const percentage = games.length === 0 ? 0 : Math.round((playedTotal / games.length) * 100);
  totalCount.textContent = String(games.length);
  playedCount.textContent = String(playedTotal);
  pendingCount.textContent = String(pendingTotal);
  progressPercent.textContent = `${percentage}%`;
  progressBar.style.width = `${percentage}%`;
  progressCaption.textContent = games.length === 0 ? "Sua jornada começa aqui" : `${playedTotal} de ${games.length} ${games.length === 1 ? "jogo jogado" : "jogos jogados"}`;
}

function updateImagePreview(): void {
  const value = imageInput.value.trim();
  imagePreviewContainer.hidden = true;
  imagePreview.removeAttribute("src");
  if (!value) return;
  const safeSource = safeImageSource(value);
  if (!safeSource) return;
  imagePreview.onload = () => { imagePreviewContainer.hidden = false; };
  imagePreview.onerror = () => { imagePreviewContainer.hidden = true; };
  imagePreviewName.textContent = value.split("/").pop()?.split("?")[0] || "Capa do jogo";
  imagePreview.src = safeSource;
}

function resetForm(): void {
  gameForm.reset();
  editingGameId = null;
  formHeading.textContent = "Adicionar jogo";
  submitButton.replaceChildren();
  const plus = document.createElement("span");
  plus.textContent = "＋";
  submitButton.append(plus, document.createTextNode(" Adicionar à biblioteca"));
  cancelEditButton.classList.add("hidden");
  imagePreviewContainer.hidden = true;
  imagePreview.removeAttribute("src");
  clearMessage();
}

function startEditing(id: number): void {
  const game = games.find((item) => item.id === id);
  if (!game) {
    showMessage("Não foi possível localizar esse jogo para edição.", "error");
    return;
  }
  editingGameId = game.id;
  titleInput.value = game.title;
  imageInput.value = game.image;
  categoryInput.value = game.category;
  yearInput.value = String(game.releaseYear);
  statusInput.value = game.status;
  formHeading.textContent = "Editar jogo";
  submitButton.textContent = "✓ Salvar alterações";
  cancelEditButton.classList.remove("hidden");
  showMessage("Edite os campos e clique em “Salvar alterações”.", "success");
  updateImagePreview();
  document.getElementById("formulario")?.scrollIntoView({ behavior: "smooth", block: "start" });
  titleInput.focus({ preventScroll: true });
}

function toggleGameStatus(id: number): void {
  const game = games.find((item) => item.id === id);
  if (!game) return;
  game.status = game.status === "played" ? "pending" : "played";
  saveGames();
  renderCatalog();
  renderFeatured();
  showToast(`Situação de “${game.title}” atualizada.`);
}

function deleteGame(id: number): void {
  const game = games.find((item) => item.id === id);
  if (!game) return;
  if (!window.confirm(`Deseja realmente excluir “${game.title}” da sua biblioteca?`)) return;
  games = games.filter((item) => item.id !== id);
  if (editingGameId === id) resetForm();
  saveGames();
  renderCatalog();
  renderFeatured();
  showToast(`“${game.title}” foi removido da biblioteca.`);
}

function addFeaturedGame(featured: FeaturedGame): void {
  const exists = games.some((game) => game.title.toLocaleLowerCase("pt-BR") === featured.title.toLocaleLowerCase("pt-BR"));
  if (exists) {
    showToast("Esse jogo já está na sua biblioteca.", "error");
    return;
  }
  games.push({ id: nextId++, title: featured.title, category: featured.category, releaseYear: featured.releaseYear, status: "pending", image: featured.image, createdAt: Date.now() });
  saveGames();
  renderCatalog();
  renderFeatured();
  showToast(`${featured.title} foi adicionado à sua biblioteca.`);
}

function exportLibrary(): void {
  const payload = { app: "GameShelf", version: 1, exportedAt: new Date().toISOString(), games };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gameshelf-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Cópia de segurança exportada.");
}

async function importLibrary(file: File): Promise<void> {
  if (file.size > 5 * 1024 * 1024) {
    showToast("O arquivo excede o limite de 5 MB.", "error");
    return;
  }
  try {
    const content = await file.text();
    const parsed: unknown = JSON.parse(content);
    const rawGames = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.games) ? parsed.games : null;
    if (!rawGames) throw new Error("O arquivo não contém uma lista de jogos reconhecida.");
    const imported: Game[] = [];
    const titles = new Set<string>();
    rawGames.forEach((raw, index) => {
      const game = normalizeGame(raw, index + 1);
      if (!game) return;
      const titleKey = game.title.toLocaleLowerCase("pt-BR");
      if (titles.has(titleKey)) return;
      titles.add(titleKey);
      imported.push(game);
    });
    if (rawGames.length > 0 && imported.length === 0) throw new Error("Nenhum jogo válido foi encontrado no arquivo.");
    const confirmed = window.confirm(`Importar ${imported.length} ${imported.length === 1 ? "jogo" : "jogos"}? A biblioteca atual será substituída.`);
    if (!confirmed) return;
    games = imported.map((game, index) => ({ ...game, id: index + 1 }));
    nextId = games.length + 1;
    activeStatusFilter = "all";
    document.querySelectorAll<HTMLButtonElement>("[data-status-filter]").forEach((button) => {
      const active = button.dataset.statusFilter === "all";
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    saveGames();
    renderCatalog();
    renderFeatured();
    showToast(`${games.length} ${games.length === 1 ? "jogo importado" : "jogos importados"} com sucesso.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível ler o arquivo.";
    showToast(message, "error");
  } finally {
    importFileInput.value = "";
  }
}

gameForm.addEventListener("submit", (event: SubmitEvent) => {
  event.preventDefault();
  clearMessage();
  const title = titleInput.value.trim();
  const category = categoryInput.value;
  const year = Number(yearInput.value);
  const statusValue = statusInput.value;
  const imageValue = imageInput.value.trim();
  const validationError = validateGame(title, category, year, imageValue);
  if (validationError) {
    showMessage(validationError, "error");
    return;
  }
  if (statusValue !== "played" && statusValue !== "pending") {
    showMessage("Selecione uma situação válida.", "error");
    return;
  }
  const image = safeImageSource(imageValue) ?? "";
  const status: GameStatus = statusValue;
  let successMessage: string;
  if (editingGameId !== null) {
    const gameToUpdate = games.find((game) => game.id === editingGameId);
    if (!gameToUpdate) {
      showMessage("O jogo que você tentou editar não foi encontrado.", "error");
      resetForm();
      return;
    }
    gameToUpdate.title = title;
    gameToUpdate.category = category;
    gameToUpdate.releaseYear = year;
    gameToUpdate.status = status;
    gameToUpdate.image = image;
    successMessage = `“${title}” foi atualizado com sucesso.`;
  } else {
    games.push({ id: nextId++, title, category, releaseYear: year, status, image, createdAt: Date.now() });
    successMessage = `“${title}” foi cadastrado com sucesso.`;
  }
  saveGames();
  resetForm();
  renderCatalog();
  renderFeatured();
  showToast(successMessage);
});

cancelEditButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", renderCatalog);
categoryFilter.addEventListener("change", renderCatalog);
sortSelect.addEventListener("change", renderCatalog);
imageInput.addEventListener("input", updateImagePreview);
removeImageButton.addEventListener("click", () => {
  imageInput.value = "";
  updateImagePreview();
  imageInput.focus();
});
clearSearchButton.addEventListener("click", () => {
  searchInput.value = "";
  renderCatalog();
  searchInput.focus();
});
document.querySelectorAll<HTMLButtonElement>("[data-status-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.dataset.statusFilter;
    if (value !== "all" && value !== "played" && value !== "pending") return;
    activeStatusFilter = value;
    document.querySelectorAll<HTMLButtonElement>("[data-status-filter]").forEach((otherButton) => {
      const active = otherButton === button;
      otherButton.classList.toggle("active", active);
      otherButton.setAttribute("aria-pressed", String(active));
    });
    renderCatalog();
  });
});
exportButton.addEventListener("click", exportLibrary);
importButton.addEventListener("click", () => importFileInput.click());
importFileInput.addEventListener("change", () => {
  const file = importFileInput.files?.[0];
  if (file) void importLibrary(file);
});
clearLibraryButton.addEventListener("click", () => {
  if (games.length === 0) {
    showToast("Sua biblioteca já está vazia.", "error");
    return;
  }
  if (!window.confirm("Tem certeza de que deseja apagar todos os jogos da biblioteca? Essa ação não pode ser desfeita sem uma cópia de segurança.")) return;
  games = [];
  nextId = 1;
  resetForm();
  saveGames();
  renderCatalog();
  renderFeatured();
  showToast("Biblioteca limpa. Você pode começar uma nova coleção.");
});

renderFeatured();
renderCatalog();
