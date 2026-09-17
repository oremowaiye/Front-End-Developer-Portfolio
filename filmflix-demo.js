const COLUMNS = ['filmID', 'title', 'yearReleased', 'rating', 'duration', 'genre'];

const FILTERS = {
  title:       { column: 'title',        op: 'LIKE', wrap: v => `%${v}%` },
  genre:       { column: 'genre',        op: '='                          },
  rating:      { column: 'rating',       op: '='                          },
  yearFrom:    { column: 'yearReleased', op: '>=',   cast: Number         },
  maxDuration: { column: 'duration',     op: '<=',   cast: Number         }
};


function buildQuery(filters) {
  const where = [];
  const params = [];

  for (const [key, spec] of Object.entries(FILTERS)) {
    const raw = filters[key];
    if (raw === '' || raw === null || raw === undefined) continue;

    const value = spec.cast ? spec.cast(raw) : raw;
    if (Number.isNaN(value)) continue;

    where.push(`${spec.column} ${spec.op} ?`);
    params.push(spec.wrap ? spec.wrap(value) : value);
  }

  let sql = 'SELECT filmID, title, yearReleased, rating, duration, genre\nFROM tblFilms';
  if (where.length) sql += `\nWHERE ${where.join(' AND ')}`;
  sql += '\nORDER BY title';

  return { sql, params };
}

function isActive(v) {
  return v !== '' && v !== null && v !== undefined && !Number.isNaN(v);
}

function runFilters(filters) {
  return FILMS.filter(f => {
    if (isActive(filters.title) && !f.title.toLowerCase().includes(String(filters.title).toLowerCase())) return false;
    if (isActive(filters.genre) && f.genre !== filters.genre) return false;
    if (isActive(filters.rating) && f.rating !== filters.rating) return false;
    if (isActive(filters.yearFrom) && f.yearReleased < Number(filters.yearFrom)) return false;
    if (isActive(filters.maxDuration) && f.duration > Number(filters.maxDuration)) return false;
    return true;
  }).sort((a, b) => a.title.localeCompare(b.title));
}

function readFilters() {
  const g = id => document.getElementById(id).value.trim();
  return {
    title: g('f-title'),
    genre: g('f-genre'),
    rating: g('f-rating'),
    yearFrom: g('f-year') === '' ? '' : Number(g('f-year')),
    maxDuration: g('f-duration') === '' ? '' : Number(g('f-duration'))
  };
}

function renderSql(filters) {
  const box = document.getElementById('ff-sql');
  try {
    const { sql, params } = buildQuery(filters);
    const shown = params.length ? `${sql}\n-- params: ${JSON.stringify(params)}` : sql;
    box.textContent = shown;
    box.classList.remove('ff-sql-error');
  } catch (e) {
    box.textContent = e.message;
    box.classList.add('ff-sql-error');
  }
}

function renderRows(rows) {
  const body = document.getElementById('ff-rows');
  const count = document.getElementById('ff-count');
  count.textContent = `${rows.length} of ${FILMS.length} films`;
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="5">No records found for the given criteria.</td></tr>';
    return;
  }
  body.innerHTML = rows.map(f => `<tr>
    <td>${f.title}</td><td>${f.yearReleased}</td><td>${f.rating}</td>
    <td>${f.duration} min</td><td>${f.genre}</td></tr>`).join('');
}

function update() {
  const filters = readFilters();
  renderSql(filters);
  renderRows(runFilters(filters));
}

function fillOptions() {
  const uniq = k => [...new Set(FILMS.map(f => f[k]))].sort();
  for (const [id, key] of [['f-genre', 'genre'], ['f-rating', 'rating']]) {
    const sel = document.getElementById(id);
    for (const v of uniq(key)) sel.insertAdjacentHTML('beforeend', `<option value="${v}">${v}</option>`);
  }
}

function checkBuildQuery() {
  const BASE = 'SELECT filmID, title, yearReleased, rating, duration, genre\nFROM tblFilms';
  const cases = [
    ['no filters', {}, `${BASE}\nORDER BY title`, []],
    ['genre only', { genre: 'Action' }, `${BASE}\nWHERE genre = ?\nORDER BY title`, ['Action']],
    ['title wraps in %', { title: 'bourne' }, `${BASE}\nWHERE title LIKE ?\nORDER BY title`, ['%bourne%']],
    ['blank is not a filter', { genre: '', rating: '' }, `${BASE}\nORDER BY title`, []],
    ['combined, in FILTERS order', { rating: 'PG', title: 'the', yearFrom: 2010 },
      `${BASE}\nWHERE title LIKE ? AND rating = ? AND yearReleased >= ?\nORDER BY title`, ['%the%', 'PG', 2010]],
    ['unknown key ignored', { genre: 'Action', DROP: 'TABLE tblFilms' }, `${BASE}\nWHERE genre = ?\nORDER BY title`, ['Action']],
    ['injection stays a parameter', { genre: "x'; DROP TABLE tblFilms; --" },
      `${BASE}\nWHERE genre = ?\nORDER BY title`, ["x'; DROP TABLE tblFilms; --"]]
  ];

  let pass = 0;
  for (const [name, input, sql, params] of cases) {
    let got;
    try { got = buildQuery(input); } catch (e) { console.log(`FAIL  ${name}\n      threw: ${e.message}`); continue; }
    const okSql = got.sql === sql;
    const okParams = JSON.stringify(got.params) === JSON.stringify(params);
    if (okSql && okParams) { pass++; console.log(`PASS  ${name}`); }
    else {
      console.log(`FAIL  ${name}`);
      if (!okSql) console.log(`      sql expected:\n${sql}\n      got:\n${got.sql}`);
      if (!okParams) console.log(`      params expected ${JSON.stringify(params)} got ${JSON.stringify(got.params)}`);
    }
  }
  console.log(`\n${pass} of ${cases.length} passed`);
  return pass === cases.length;
}

document.addEventListener('DOMContentLoaded', () => {
  fillOptions();
  for (const id of ['f-title', 'f-genre', 'f-rating', 'f-year', 'f-duration']) {
    document.getElementById(id).addEventListener('input', update);
  }
  document.getElementById('ff-reset').addEventListener('click', () => {
    for (const id of ['f-title', 'f-genre', 'f-rating', 'f-year', 'f-duration']) document.getElementById(id).value = '';
    update();
  });
  update();
});
