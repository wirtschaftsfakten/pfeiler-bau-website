(() => {
  'use strict';

  document.documentElement.classList.add('js');
  const qs = (selector, context = document) => context.querySelector(selector);
  const qsa = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const body = document.body;
  const root = document.documentElement.dataset.root || '';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const createSvg = (pathData) => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('icon');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', pathData);
    svg.append(path);
    return svg;
  };

  /* Header and desktop mega menus */
  const header = qs('[data-header]');
  const logo = qs('.brand img');
  const navItems = qsa('.desktop-nav .nav-item');
  let openNavItem = null;

  const setMenuState = (item, open, returnFocus = false) => {
    if (!item) return;
    const trigger = qs(':scope > .nav-trigger', item);
    item.classList.toggle('is-open', open);
    if (trigger?.tagName === 'BUTTON') trigger.setAttribute('aria-expanded', String(open));
    const mega = qs(':scope > .mega', item);
    if (mega) mega.setAttribute('aria-hidden', String(!open));
    if (!open && returnFocus && trigger) trigger.focus();
    openNavItem = open ? item : (openNavItem === item ? null : openNavItem);
  };

  const closeDesktopMenus = (except = null, returnFocus = false) => {
    navItems.forEach((item) => {
      if (item !== except) setMenuState(item, false, returnFocus && item === openNavItem);
    });
  };

  const syncHeader = () => {
    if (!header) return;
    const scrolled = scrollY > 36;
    header.classList.toggle('is-scrolled', scrolled);
    if (logo) {
      const useLight = body.classList.contains('header-theme-dark') && !scrolled;
      const source = useLight ? logo.dataset.lightSrc : logo.dataset.darkSrc;
      if (source && logo.getAttribute('src') !== source) logo.setAttribute('src', source);
    }
  };

  navItems.forEach((item) => {
    const trigger = qs(':scope > .nav-trigger', item);
    const mega = qs(':scope > .mega', item);
    if (mega) mega.setAttribute('aria-hidden', 'true');
    if (!trigger || trigger.tagName !== 'BUTTON') return;
    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = !item.classList.contains('is-open');
      closeDesktopMenus(item);
      setMenuState(item, open);
    });
    item.addEventListener('mouseenter', () => {
      closeDesktopMenus(item);
      setMenuState(item, true);
    });
    item.addEventListener('mouseleave', () => setMenuState(item, false));
    item.addEventListener('focusout', (event) => {
      if (!item.contains(event.relatedTarget)) setMenuState(item, false);
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.desktop-nav')) closeDesktopMenus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && openNavItem) {
      const current = openNavItem;
      setMenuState(current, false, true);
    }
  });
  syncHeader();
  addEventListener('scroll', syncHeader, { passive: true });

  /* Dynamic image preview in services menu */
  qsa('.mega-services').forEach((menu) => {
    const preview = qs('[data-mega-preview]', menu);
    const links = qsa('[data-mega-image]', menu);
    if (!preview || !links.length) return;
    const image = qs('img', preview);
    const title = qs('h3', preview);
    const copy = qs('p', preview);
    const update = (link) => {
      links.forEach((candidate) => candidate.classList.toggle('is-previewing', candidate === link));
      if (image && link.dataset.megaImage) {
        image.src = link.dataset.megaImage;
        image.alt = link.dataset.megaTitle || '';
      }
      if (title) title.textContent = link.dataset.megaTitle || '';
      if (copy) copy.textContent = link.dataset.megaCopy || '';
      if (link.dataset.megaLink) preview.href = link.dataset.megaLink;
    };
    links.forEach((link) => {
      link.addEventListener('mouseenter', () => update(link));
      link.addEventListener('focus', () => update(link));
    });
    update(links[0]);
  });

  /* Accessible mobile menu with focus trap and focus return */
  const menuToggle = qs('.menu-toggle');
  const mobileMenu = qs('.mobile-menu');
  let previousFocus = null;
  const mobileFocusable = () => qsa('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', mobileMenu || document);
  const closeMobileMenu = (returnFocus = true) => {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    body.classList.remove('menu-open');
    if (returnFocus && previousFocus) previousFocus.focus();
  };
  if (menuToggle && mobileMenu) {
    mobileMenu.setAttribute('aria-hidden', 'true');
    menuToggle.addEventListener('click', () => {
      const open = menuToggle.getAttribute('aria-expanded') === 'true';
      if (open) return closeMobileMenu();
      previousFocus = document.activeElement;
      menuToggle.setAttribute('aria-expanded', 'true');
      mobileMenu.classList.add('open');
      mobileMenu.setAttribute('aria-hidden', 'false');
      body.classList.add('menu-open');
      setTimeout(() => mobileFocusable()[0]?.focus(), 80);
    });
    qsa('a', mobileMenu).forEach((link) => link.addEventListener('click', () => closeMobileMenu(false)));
    mobileMenu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') return closeMobileMenu();
      if (event.key !== 'Tab') return;
      const focusable = mobileFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /* FAQ and project filters */
  qsa('.faq-list details').forEach((details) => details.addEventListener('toggle', () => {
    if (!details.open) return;
    qsa('details[open]', details.parentElement).forEach((other) => {
      if (other !== details) other.removeAttribute('open');
    });
  }));

  const filter = qs('[data-filter]');
  if (filter) {
    const cards = qsa('[data-filter-grid] [data-category]');
    filter.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-filter-value]');
      if (!button) return;
      qsa('button', filter).forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle('active', active);
        candidate.setAttribute('aria-pressed', String(active));
      });
      cards.forEach((card) => {
        card.hidden = button.dataset.filterValue !== 'all' && card.dataset.category !== button.dataset.filterValue;
      });
    });
  }

  /* Scroll progress and back-to-top */
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  const progressBar = document.createElement('span');
  progress.append(progressBar);
  body.prepend(progress);

  const backTop = document.createElement('button');
  backTop.className = 'back-top';
  backTop.type = 'button';
  backTop.setAttribute('aria-label', 'Zum Seitenanfang');
  backTop.append(createSvg('m6 15 6-6 6 6'));
  body.append(backTop);
  backTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  const updateScrollUi = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.width = `${max > 0 ? Math.min(100, scrollY / max * 100) : 0}%`;
    backTop.classList.toggle('visible', scrollY > 620);
  };
  updateScrollUi();
  addEventListener('scroll', updateScrollUi, { passive: true });
  addEventListener('resize', updateScrollUi);

  /* Restrained reveal motion */
  const reveals = qsa('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((node) => node.classList.add('in-view'));
  } else {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }), { threshold: 0.08, rootMargin: '0px 0px -28px' });
    reveals.forEach((node) => observer.observe(node));
  }

  /* Homepage quick navigator */
  const homeNavigator = qs('[data-navigator]');
  if (homeNavigator) {
    const state = { audience: '', type: '', phase: '' };
    const names = { hochbau: 'Hochbau & Rohbau', tiefbau: 'Tiefbau & Kanalbau', abbruch: 'Abbruch & Entkernung', sanierung: 'Sanierung im Bestand', aussen: 'Außenanlagen & Pflaster', pool: 'Poolbau' };
    const result = qs('.navigator-result', homeNavigator);
    qsa('[data-choice]', homeNavigator).forEach((button) => button.addEventListener('click', () => {
      const group = button.dataset.group;
      state[group] = button.dataset.choice;
      qsa(`[data-group="${group}"]`, homeNavigator).forEach((candidate) => candidate.classList.toggle('active', candidate === button));
      if (!state.type || !result) return;
      qs('h3', result).textContent = `Projektprüfung: ${names[state.type]}`;
      qs('p', result).textContent = state.phase === 'planung'
        ? 'Pläne, Leistungsverzeichnis und Terminrahmen können im Projektstart direkt ergänzt werden.'
        : 'Standort, Fotos, Zeitraum und eine präzise Aufgabenbeschreibung reichen für die erste Einordnung.';
      const link = qs('a', result);
      if (link) link.href = `${root}projekt-navigator.html?leistung=${encodeURIComponent(state.type)}#anfrage`;
    }));
  }

  /* Six-step project request with focus management and safe summary rendering */
  const requestForm = qs('[data-project-request]');
  if (requestForm) {
    const steps = qsa('.request-step', requestForm);
    const progressItems = qsa('[data-progress]', requestForm);
    const errorSummary = qs('[data-error-summary]', requestForm);
    const errorList = qs('ul', errorSummary || document);
    const serviceContext = qs('[data-service-context]', requestForm);
    let current = 0;

    const fieldLabel = (field) => {
      const explicit = field.id ? qs(`label[for="${CSS.escape(field.id)}"]`, requestForm) : null;
      return explicit?.textContent.trim() || field.closest('label')?.textContent.trim() || field.name || 'Pflichtfeld';
    };

    const clearErrors = () => {
      qsa('[aria-invalid="true"]', requestForm).forEach((field) => field.removeAttribute('aria-invalid'));
      if (errorSummary) errorSummary.hidden = true;
      if (errorList) errorList.replaceChildren();
      qsa('.step-error', requestForm).forEach((node) => { node.textContent = ''; });
    };

    const showErrors = (fields) => {
      if (!fields.length || !errorSummary || !errorList) return;
      errorList.replaceChildren();
      fields.forEach((field) => {
        field.setAttribute('aria-invalid', 'true');
        if (!field.id) field.id = `field-${Math.random().toString(36).slice(2, 9)}`;
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${field.id}`;
        link.textContent = `${fieldLabel(field)} prüfen`;
        item.append(link);
        errorList.append(item);
      });
      errorSummary.hidden = false;
      errorSummary.focus();
    };

    const validateFile = (field) => {
      const max = Number(field.dataset.maxFileSize || 10485760);
      const allowed = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'];
      return Array.from(field.files || []).every((file) => file.size <= max && allowed.includes(file.name.split('.').pop().toLowerCase()));
    };

    const validateStep = (index) => {
      clearErrors();
      const step = steps[index];
      if (!step) return true;
      const invalid = [];
      const required = qsa('[required]', step);
      const radioNames = [...new Set(required.filter((field) => field.type === 'radio').map((field) => field.name))];
      radioNames.forEach((name) => {
        if (!qs(`input[type="radio"][name="${CSS.escape(name)}"]:checked`, step)) {
          const first = qs(`input[type="radio"][name="${CSS.escape(name)}"]`, step);
          if (first) invalid.push(first);
        }
      });
      required.filter((field) => field.type !== 'radio').forEach((field) => {
        if (!field.checkValidity()) invalid.push(field);
      });
      qsa('input[type="file"]', step).forEach((field) => {
        if (!validateFile(field)) invalid.push(field);
      });
      if (invalid.length) {
        const message = qs('.step-error', step);
        if (message) message.textContent = 'Bitte vervollständigen oder korrigieren Sie die markierten Angaben.';
        showErrors(invalid);
        return false;
      }
      return true;
    };

    const value = (name) => {
      const checked = qs(`[name="${CSS.escape(name)}"]:checked`, requestForm);
      if (checked) return checked.value;
      const field = qs(`[name="${CSS.escape(name)}"]`, requestForm);
      return field ? field.value.trim() : '';
    };

    const renderSummary = () => {
      const target = qs('[data-request-summary]', requestForm);
      if (!target) return;
      target.replaceChildren();
      [
        ['Auftraggeber', value('Auftraggeber')],
        ['Bauaufgabe', value('Bauaufgabe')],
        ['Projektstand', value('Projektstand')],
        ['Standort', value('Projektstandort')],
        ['Zeitraum', value('Ausführungszeitraum')],
        ['Ansprechpartner', value('Name')]
      ].forEach(([label, content]) => {
        const row = document.createElement('div');
        const caption = document.createElement('span');
        const result = document.createElement('b');
        caption.textContent = label;
        result.textContent = content || 'Noch nicht angegeben';
        row.append(caption, result);
        target.append(row);
      });
    };

    const showStep = (index, focus = true) => {
      current = Math.max(0, Math.min(steps.length - 1, index));
      steps.forEach((step, stepIndex) => {
        const active = stepIndex === current;
        step.classList.toggle('active', active);
        step.hidden = !active;
        step.setAttribute('aria-hidden', String(!active));
      });
      progressItems.forEach((item, itemIndex) => {
        const active = itemIndex === current;
        item.classList.toggle('active', itemIndex <= current);
        if (active) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
      });
      if (current === steps.length - 1) renderSummary();
      if (focus) {
        const heading = qs('h2, h3, legend', steps[current]);
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      }
    };

    qsa('[data-request-next]', requestForm).forEach((button) => button.addEventListener('click', () => {
      if (validateStep(current)) showStep(current + 1);
    }));
    qsa('[data-request-prev]', requestForm).forEach((button) => button.addEventListener('click', () => showStep(current - 1)));
    qsa('.request-choice input', requestForm).forEach((input) => input.addEventListener('change', () => {
      input.removeAttribute('aria-invalid');
      if (input.name === 'Bauaufgabe' && serviceContext) serviceContext.value = input.value;
    }));

    const requestedService = new URLSearchParams(location.search).get('leistung');
    if (requestedService) {
      const serviceRadio = qs(`[data-service="${CSS.escape(requestedService)}"]`, requestForm);
      if (serviceRadio) {
        serviceRadio.checked = true;
        if (serviceContext) serviceContext.value = serviceRadio.value;
      }
    }
    requestForm.addEventListener('submit', (event) => {
      const invalidStep = steps.findIndex((step, index) => !validateStep(index));
      if (invalidStep >= 0) {
        event.preventDefault();
        showStep(invalidStep, false);
      }
    });
    showStep(0, false);
  }

  /* Article reading rail */
  const article = qs('[data-article-main]');
  const articleSide = qs('[data-article-side]');
  if (article && articleSide) {
    const links = qsa('.article-toc a', articleSide);
    const sections = links.map((link) => qs(link.getAttribute('href'))).filter(Boolean);
    const bar = qs('[data-article-progress]', articleSide);
    const percent = qs('[data-article-percent]', articleSide);
    let frame = 0;
    const updateArticle = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const start = article.offsetTop - 150;
        const end = start + article.offsetHeight - Math.min(innerHeight * 0.55, 520);
        const value = Math.max(0, Math.min(1, (scrollY - start) / Math.max(1, end - start)));
        if (bar) bar.style.width = `${(value * 100).toFixed(1)}%`;
        if (percent) percent.textContent = `${Math.round(value * 100)} %`;
        let active = sections[0]?.id || '';
        sections.forEach((section) => { if (section.getBoundingClientRect().top <= Math.min(220, innerHeight * 0.3)) active = section.id; });
        links.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${active}`));
      });
    };
    links.forEach((link) => link.addEventListener('click', (event) => {
      const target = qs(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }));
    updateArticle();
    addEventListener('scroll', updateArticle, { passive: true });
    addEventListener('resize', updateArticle);
  }

  /* Mobile conversion bar only on core entry pages, with reserved layout space */
  const mobileCtaAllowed = ['template-home', 'template-services-index', 'template-service-hub', 'template-projectstart'].some((name) => body.classList.contains(name));
  if (mobileCtaAllowed && innerWidth <= 560 && !qs('.mobile-bottom-cta')) {
    const bar = document.createElement('nav');
    bar.className = 'mobile-bottom-cta';
    bar.setAttribute('aria-label', 'Schnellaktionen');
    const call = document.createElement('a');
    call.href = 'tel:+4917684322412';
    call.textContent = 'Anrufen';
    const project = document.createElement('a');
    project.href = `${root}projekt-navigator.html#anfrage`;
    project.textContent = 'Projekt prüfen';
    bar.append(call, project);
    body.append(bar);
    body.classList.add('has-mobile-cta');
    const update = () => bar.classList.toggle('visible', scrollY > Math.max(520, innerHeight * 0.75));
    update();
    addEventListener('scroll', update, { passive: true });
  }
})();


/* V15 — Google review carousel */
(() => {
  const root = document.querySelector('[data-google-reviews]');
  if (!root) return;
  const track = root.querySelector('[data-review-track]');
  const cards = Array.from(root.querySelectorAll('[data-review-card]'));
  const prev = document.querySelector('[data-review-prev]');
  const next = document.querySelector('[data-review-next]');
  const current = document.querySelector('[data-review-current]');
  const progress = document.querySelector('[data-review-progress]');
  if (!track || !cards.length || !prev || !next) return;
  let index = 0;
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
  const update = (nextIndex, focusCard = false) => {
    index = Math.max(0, Math.min(cards.length - 1, nextIndex));
    if (isMobile()) {
      cards[index].scrollIntoView({behavior:'smooth',block:'nearest',inline:'start'});
    } else {
      const gap = parseFloat(getComputedStyle(track).gap) || 16;
      track.style.transform = `translateX(-${index * (cards[0].getBoundingClientRect().width + gap)}px)`;
    }
    if (current) current.textContent = String(index + 1).padStart(2,'0');
    if (progress) progress.style.width = `${((index + 1) / cards.length) * 100}%`;
    prev.disabled = index === 0;
    next.disabled = index === cards.length - 1;
    if (focusCard) cards[index].focus({preventScroll:true});
  };
  prev.addEventListener('click', () => update(index - 1, true));
  next.addEventListener('click', () => update(index + 1, true));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); update(index + 1, true); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); update(index - 1, true); }
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!isMobile()) return;
      const visible = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
      if (visible) {
        const i = cards.indexOf(visible.target);
        if (i >= 0) { index=i; if(current) current.textContent=String(i+1).padStart(2,'0'); if(progress) progress.style.width=`${((i+1)/cards.length)*100}%`; }
      }
    }, {root, threshold:[.55,.75]});
    cards.forEach(card => observer.observe(card));
  }
  window.addEventListener('resize', () => update(index));
  update(0);
})();


/* V18 — compact editorial review deck */
(() => {
  const root = document.querySelector('[data-review-deck]');
  if (!root) return;
  const panels = Array.from(root.querySelectorAll('[data-review-panel]'));
  const indicators = Array.from(root.querySelectorAll('[data-review-index]'));
  const back = root.querySelector('[data-review-back]');
  const forward = root.querySelector('[data-review-forward]');
  const number = root.querySelector('[data-review-number]');
  let index = 0;

  const show = (next, focusIndicator = false) => {
    index = (next + panels.length) % panels.length;
    panels.forEach((panel, panelIndex) => {
      const active = panelIndex === index;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
      panel.classList.remove('is-expanded');
      const expander = panel.querySelector('[data-review-expand]');
      if (expander) {
        expander.textContent = 'Mehr lesen';
        expander.setAttribute('aria-expanded', 'false');
      }
    });
    indicators.forEach((indicator, indicatorIndex) => {
      const active = indicatorIndex === index;
      indicator.classList.toggle('is-active', active);
      indicator.setAttribute('aria-pressed', String(active));
      indicator.tabIndex = active ? 0 : -1;
    });
    if (number) number.textContent = String(index + 1).padStart(2, '0');
    if (focusIndicator && indicators[index]) indicators[index].focus();
  };

  indicators.forEach((indicator, indicatorIndex) => {
    indicator.addEventListener('click', () => show(indicatorIndex));
  });
  back?.addEventListener('click', () => show(index - 1));
  forward?.addEventListener('click', () => show(index + 1));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1, true); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1, true); }
  });
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-review-expand]');
    if (!button) return;
    const panel = button.closest('[data-review-panel]');
    if (!panel) return;
    const expanded = panel.classList.toggle('is-expanded');
    button.textContent = expanded ? 'Weniger anzeigen' : 'Mehr lesen';
    button.setAttribute('aria-expanded', String(expanded));
  });
  show(0);
})();


/* V17.1 — only show expand controls when a review is clamped */
(() => {
  const root = document.querySelector('[data-review-deck]');
  if (!root) return;
  const sync = () => {
    root.querySelectorAll('[data-review-panel]').forEach(panel => {
      const quote = panel.querySelector('blockquote');
      const button = panel.querySelector('[data-review-expand]');
      if (!quote || !button) return;
      const wasExpanded = panel.classList.contains('is-expanded');
      panel.classList.remove('is-expanded');
      const clamped = quote.scrollHeight > quote.clientHeight + 2;
      button.hidden = !clamped;
      if (wasExpanded && clamped) panel.classList.add('is-expanded');
    });
  };
  requestAnimationFrame(sync);
  addEventListener('resize', sync, {passive:true});
  root.addEventListener('click', event => {
    if (event.target.closest('[data-review-index], [data-review-back], [data-review-forward]')) requestAnimationFrame(sync);
  });
})();
