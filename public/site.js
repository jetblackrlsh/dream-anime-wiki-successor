(() => {
  const base = window.DREAM_WIKI_BASE || '';
  const canvas = document.querySelector('#starfield');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (canvas) {
    const context = canvas.getContext('2d');
    let stars = [];
    let width = 0;
    let height = 0;
    let frame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(240, Math.floor((width * height) / 6500));
      stars = Array.from({ length: count }, (_, index) => ({
        x: ((index * 7919) % 1000) / 1000 * width,
        y: ((index * 6271) % 1000) / 1000 * height,
        r: 0.35 + ((index * 17) % 19) / 19 * 1.2,
        phase: (index * 1.71) % (Math.PI * 2),
        color: index % 11 === 0 ? '215, 188, 255' : index % 7 === 0 ? '245, 203, 96' : '255, 255, 255'
      }));
    };

    const draw = (time = 0) => {
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const pulse = reducedMotion ? 0.62 : 0.42 + Math.sin(time * 0.001 + star.phase) * 0.25;
        context.beginPath();
        context.fillStyle = `rgba(${star.color}, ${Math.max(0.14, pulse)})`;
        context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        context.fill();
      }
      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pagehide', () => cancelAnimationFrame(frame), { once: true });
  }

  const form = document.querySelector('#search-form');
  if (!form) return;

  const queryInput = document.querySelector('#search-input');
  const dateInput = document.querySelector('#date-input');
  const sortInput = document.querySelector('#sort-input');
  const list = document.querySelector('#episode-list');
  const count = document.querySelector('#result-count');
  const clear = document.querySelector('#clear-search');
  let episodes = [];

  const escape = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);

  const row = (episode) => `<article class="episode-row">
    <a href="${escape(episode.url)}">
      <span class="episode-date">${escape(episode.dateLabel)}</span>
      <h3>${escape(episode.title)}</h3>
      <p>${escape(episode.summary)}</p>
      <span class="read-link">Enter this dream <span aria-hidden="true">↗</span></span>
    </a>
  </article>`;

  const render = () => {
    const terms = queryInput.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const date = dateInput.value;
    let matches = episodes.filter((episode) => {
      const haystack = `${episode.title} ${episode.text}`.toLocaleLowerCase();
      return (!date || episode.date === date) && terms.every((term) => haystack.includes(term));
    });

    if (sortInput.value === 'oldest') matches.sort((a, b) => a.timestamp - b.timestamp || a.title.localeCompare(b.title));
    else if (sortInput.value === 'title') matches.sort((a, b) => a.title.localeCompare(b.title));
    else matches.sort((a, b) => b.timestamp - a.timestamp || a.title.localeCompare(b.title));

    const searching = terms.length > 0 || Boolean(date);
    const visible = searching ? matches : matches.slice(0, 18);
    list.innerHTML = visible.length ? visible.map(row).join('') : `<div class="empty-results"><span aria-hidden="true">✦</span><h3>No dreams found</h3><p>Try a different word or clear the creation date.</p></div>`;
    count.textContent = searching ? `${matches.length.toLocaleString()} ${matches.length === 1 ? 'dream' : 'dreams'} found` : `Latest ${visible.length} episodes`;
    clear.hidden = !searching;

    const url = new URL(window.location.href);
    queryInput.value ? url.searchParams.set('q', queryInput.value) : url.searchParams.delete('q');
    date ? url.searchParams.set('date', date) : url.searchParams.delete('date');
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const params = new URLSearchParams(window.location.search);
  queryInput.value = params.get('q') || '';
  dateInput.value = params.get('date') || '';

  fetch(`${base}/search-index.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`Search index returned ${response.status}`);
      return response.json();
    })
    .then((data) => {
      episodes = data;
      render();
    })
    .catch(() => {
      count.textContent = 'Search is temporarily unavailable';
    });

  form.addEventListener('submit', (event) => event.preventDefault());
  queryInput.addEventListener('input', render);
  dateInput.addEventListener('input', render);
  sortInput.addEventListener('change', render);
  clear.addEventListener('click', () => {
    queryInput.value = '';
    dateInput.value = '';
    queryInput.focus();
    render();
  });
})();
