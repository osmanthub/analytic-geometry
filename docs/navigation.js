/* Hash routes keep the original workspaces and their local state mounted. */
(() => {
  'use strict';
  const panelIds = ['home', 'learn', 'library', 'practice', 'lab', 'exercises', 'surface-drawing', 'offline'];
  const courseIds = ['learn', 'library', 'practice'];
  const titles = {offline:'离线学习与记录备份','surface-drawing':'二次曲面作图',home: '首页', learn: '知识导读', library: '四部讲义', practice: '基础自测', lab: '交互实验', exercises: '精选习题'};
  const panels = panelIds.map(id => document.getElementById(id));
  const courseNav = document.querySelector('.course-nav');
  const locationBar = document.querySelector('.workspace-location');
  let activePanel = null;

  function currentRoute() {
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { hash = ''; }
    if (!hash || hash === 'home') return {id: 'home', target: null};
    if (panelIds.includes(hash)) return {id: hash, target: null};
    // Retain old section anchors, including the section experiment and its equations.
    const target = document.getElementById(hash);
    const parent = target && target.closest('main > section');
    if (parent && panelIds.includes(parent.id)) return {id: parent.id, target};
    if (hash === 'mainContent') return {id: activePanel || 'home', target: null};
    return {id: 'home', target: null};
  }

  function showRoute(initial = false) {
    const route = currentRoute();
    const workspace = courseIds.includes(route.id) ? 'course' : route.id;
    const changed = activePanel !== route.id;
    panels.forEach(panel => { panel.hidden = panel.id !== route.id; });
    courseNav.hidden = workspace !== 'course';
    locationBar.hidden = route.id === 'home';
    document.getElementById('workspaceLabel').textContent = workspace === 'course' ? '课程学习 / ' + titles[route.id] : titles[route.id];
    document.querySelectorAll('.primary-nav a').forEach(link => {
      if (link.dataset.workspace === workspace) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    courseNav.querySelectorAll('a').forEach(link => {
      if (link.hash === '#' + route.id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = route.id === 'home' ? '几何学基础—解析几何' : titles[route.id] + ' · 几何学基础—解析几何';
    document.body.dataset.workspace = workspace;
    activePanel = route.id;

    // Paint only after display:none is removed and layout has a real canvas size.
    requestAnimationFrame(() => {
      if (route.id === 'home' && typeof drawHero === 'function') drawHero();
      if (route.id === 'lab' && typeof drawLab === 'function') drawLab();
      if (route.target && route.target.id !== 'section') route.target.scrollIntoView({block: 'start', behavior: 'instant'});
      else if (changed || initial) window.scrollTo({top: 0, behavior: 'instant'});
    });
  }

  window.addEventListener('hashchange', () => showRoute());
  // Clicking the current top-level tab is a predictable way back to its heading.
  document.querySelectorAll('.primary-nav a, .course-nav a, .brand, .workspace-location a').forEach(link => {
    link.addEventListener('click', () => {
      if (link.hash === location.hash) window.scrollTo({top: 0, behavior: 'instant'});
    });
  });
  showRoute(true);
})();
