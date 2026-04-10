/**
 * checklist.js
 * Diagnóstico por grupo + resultado específico baseado nas lacunas reais
 */

(function () {
  'use strict';

  // Grupos com seus pesos e mensagens específicas de lacuna
  var GROUPS = [
    {
      id:    'gro',
      label: 'GRO e PGR',
      total: 3,
      lacuna: 'O mapeamento e a documentação de riscos psicossociais ainda não estão estruturados.',
    },
    {
      id:    'lideranca',
      label: 'Liderança e cultura',
      total: 3,
      lacuna: 'Seus gestores não têm preparo formal para identificar e reduzir riscos psicossociais.',
    },
    {
      id:    'aprendizagem',
      label: 'Aprendizagem e métricas',
      total: 4,
      lacuna: 'Faltam trilhas de capacitação e dados de clima para evidenciar conformidade em auditoria.',
    },
  ];

  // Mensagens por faixa + gap específico
  var RISK_LEVELS = [
    {
      range: [0, 3],
      type:  'danger',
      title: 'Risco alto: sua empresa precisa agir agora',
      cta:   'Quero resolver isso antes de maio',
    },
    {
      range: [4, 6],
      type:  'warning',
      title: 'Risco moderado: há lacunas importantes a corrigir',
      cta:   'Revisar com um especialista',
    },
    {
      range: [7, 9],
      type:  'warning',
      title: 'Quase lá, mas ainda há pontos em aberto',
      cta:   'Validar os pontos restantes com especialista',
    },
    {
      range: [10, 10],
      type:  'ok',
      title: 'Cobertura completa. Vale confirmar com especialista.',
      cta:   'Confirmar conformidade com especialista',
    },
  ];

  function getRiskLevel(count) {
    return RISK_LEVELS.find(function (r) {
      return count >= r.range[0] && count <= r.range[1];
    });
  }

  // Calcula score de cada grupo a partir dos checkboxes marcados
  function getGroupScores() {
    var scores = {};
    GROUPS.forEach(function (group) {
      var fieldset = document.querySelector('[data-group="' + group.id + '"]');
      if (!fieldset) return;
      var checked = fieldset.querySelectorAll('input[type="checkbox"]:checked').length;
      scores[group.id] = { checked: checked, total: group.total };
    });
    return scores;
  }

  // Retorna grupos com lacuna (qualquer item não marcado = lacuna)
  function getWeakGroups(scores) {
    return GROUPS.filter(function (group) {
      var s = scores[group.id];
      if (!s) return false;
      return s.checked < s.total;
    });
  }

  // Coleta mensagens individuais de cada checkbox não marcado por grupo
  function getItemLacunas(groupId) {
    var fieldset = document.querySelector('[data-group="' + groupId + '"]');
    if (!fieldset) return [];
    var unchecked = fieldset.querySelectorAll('input[type="checkbox"]:not(:checked)');
    var lacunas = [];
    unchecked.forEach(function (cb) {
      if (cb.dataset.lacuna) lacunas.push(cb.dataset.lacuna);
    });
    return lacunas;
  }

  // Monta o HTML dos badges de lacuna
  function buildGapsHTML(weakGroups, scores) {
    if (!weakGroups.length) return '';

    var badges = GROUPS.map(function (group) {
      var s = scores[group.id] || { checked: 0, total: group.total };
      var isWeak = weakGroups.some(function (w) { return w.id === group.id; });
      var cls = isWeak ? 'gap-badge gap-badge--weak' : 'gap-badge gap-badge--ok';
      var icon = isWeak
        ? '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M5 2v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
        : '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
      return '<span class="' + cls + '">' + icon + group.label + ' (' + s.checked + '/' + s.total + ')</span>';
    }).join('');

    // Lista de lacunas específicas por item não marcado, agrupadas por grupo
    var lacunaBlocks = weakGroups.map(function (group) {
      var items = getItemLacunas(group.id);
      if (!items.length) return '';
      var listItems = items.map(function (msg) {
        return '<li class="gaps-item">' + msg + '</li>';
      }).join('');
      return (
        '<div class="gaps-group">' +
          '<p class="gaps-group__label">' + group.label + '</p>' +
          '<ul class="gaps-list">' + listItems + '</ul>' +
        '</div>'
      );
    }).join('');

    return (
      '<p class="gaps-label">Lacunas identificadas:</p>' +
      '<div class="gaps-badges">' + badges + '</div>' +
      lacunaBlocks
    );
  }

  function handleChange() {
    var allCheckboxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');
    var totalChecked  = 0;

    allCheckboxes.forEach(function (cb) {
      var item = cb.closest('.checklist-item');
      if (cb.checked) {
        totalChecked++;
        if (item) item.classList.add('is-checked');
      } else {
        if (item) item.classList.remove('is-checked');
      }
    });

    updateProgress(totalChecked);
    updateResult(totalChecked);
  }

  function updateProgress(checked) {
    var countEl = document.getElementById('checklist-count');
    var fillEl  = document.getElementById('checklist-fill');
    var barEl   = document.querySelector('.checklist-progress__bar');
    var total   = allCheckboxes().length || 10;

    if (countEl) countEl.textContent = checked + '/' + total;
    if (fillEl)  fillEl.style.width  = (checked / total * 100) + '%';
    if (barEl)   barEl.setAttribute('aria-valuenow', checked);
  }

  function allCheckboxes() {
    return document.querySelectorAll('.checklist-item input[type="checkbox"]');
  }

  function updateResult(checked) {
    var resultEl    = document.getElementById('checklist-result');
    var titleEl     = document.getElementById('checklist-result-title');
    var gapsEl      = document.getElementById('checklist-result-gaps');
    var descEl      = document.getElementById('checklist-result-desc');
    var ctaEl       = document.getElementById('checklist-result-cta');

    if (!resultEl) return;

    if (checked === 0) {
      resultEl.classList.remove('is-visible', 'checklist-result--danger', 'checklist-result--warning', 'checklist-result--ok');
      return;
    }

    var level       = getRiskLevel(checked);
    var scores      = getGroupScores();
    var weakGroups  = getWeakGroups(scores);

    // Atualiza tipo visual
    resultEl.classList.remove('checklist-result--danger', 'checklist-result--warning', 'checklist-result--ok');
    resultEl.classList.add('checklist-result--' + level.type, 'is-visible');

    if (titleEl) titleEl.textContent = level.title;
    if (ctaEl)   { ctaEl.textContent = level.cta; ctaEl.href = '#form'; }

    // Gaps específicos
    if (gapsEl) {
      gapsEl.innerHTML = weakGroups.length > 0
        ? buildGapsHTML(weakGroups, scores)
        : '<p class="gaps-desc gaps-desc--ok">Todos os grupos com boa cobertura. Uma conversa com especialista pode validar os detalhes.</p>';
    }

    // Descrição genérica vira complemento — esconde se os gaps já contam a história
    if (descEl) descEl.style.display = 'none';
  }

  function bindCheckboxes() {
    allCheckboxes().forEach(function (cb) {
      cb.addEventListener('change', handleChange);
    });
  }

  function init() {
    var checklistEl = document.getElementById('checklist');
    if (!checklistEl) return;
    bindCheckboxes();
    updateProgress(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
