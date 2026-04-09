/**
 * checklist.js
 * Checklist interativo de autodiagnóstico NR-1
 * Contagem em tempo real + resultado dinâmico por faixa
 */

(function () {
  'use strict';

  var TOTAL_ITEMS = 10;

  var resultConfig = [
    {
      range: [0, 3],
      type: 'danger',
      title: 'Risco alto: sua empresa precisa agir agora',
      desc: 'Você marcou poucos itens. Há lacunas críticas que expõem sua empresa a riscos legais, trabalhistas e de saúde organizacional antes da vigência da NR-1 em maio de 2026.',
      cta: 'Falar com especialista urgente',
    },
    {
      range: [4, 6],
      type: 'warning',
      title: 'Risco moderado: há lacunas importantes a corrigir',
      desc: 'Você já tem algumas práticas, mas existem brechas relevantes. Uma revisão estruturada com especialistas pode garantir conformidade plena antes do prazo.',
      cta: 'Revisar com um especialista',
    },
    {
      range: [7, 10],
      type: 'ok',
      title: 'Bom caminho, mas vale uma revisão com especialista',
      desc: 'Sua empresa está no caminho certo. Mesmo assim, uma conversa com especialistas pode identificar pontos de melhoria e assegurar rastreabilidade completa para auditorias.',
      cta: 'Confirmar conformidade com especialista',
    },
  ];

  function getResult(count) {
    return resultConfig.find(function (r) {
      return count >= r.range[0] && count <= r.range[1];
    });
  }

  function updateProgress(checked) {
    var countEl     = document.getElementById('checklist-count');
    var fillEl      = document.getElementById('checklist-fill');
    var resultEl    = document.getElementById('checklist-result');
    var resultTitle = document.getElementById('checklist-result-title');
    var resultDesc  = document.getElementById('checklist-result-desc');
    var resultCta   = document.getElementById('checklist-result-cta');

    if (countEl) countEl.textContent = checked + '/' + TOTAL_ITEMS;
    if (fillEl)  fillEl.style.width  = (checked / TOTAL_ITEMS * 100) + '%';

    if (!resultEl) return;

    if (checked === 0) {
      resultEl.classList.remove('is-visible', 'checklist-result--danger', 'checklist-result--warning', 'checklist-result--ok');
      return;
    }

    var config = getResult(checked);
    if (!config) return;

    resultEl.classList.remove('checklist-result--danger', 'checklist-result--warning', 'checklist-result--ok');
    resultEl.classList.add('checklist-result--' + config.type, 'is-visible');

    if (resultTitle) resultTitle.textContent = config.title;
    if (resultDesc)  resultDesc.textContent  = config.desc;
    if (resultCta) {
      resultCta.textContent = config.cta;
      resultCta.href = '#form';
    }
  }

  function handleChange() {
    var items   = document.querySelectorAll('.checklist-item input[type="checkbox"]');
    var checked = 0;

    items.forEach(function (cb) {
      var item = cb.closest('.checklist-item');
      if (cb.checked) {
        checked++;
        if (item) item.classList.add('is-checked');
      } else {
        if (item) item.classList.remove('is-checked');
      }
    });

    updateProgress(checked);
  }

  function bindCheckboxes() {
    // O label já toglla o checkbox nativamente (implicit label).
    // Basta escutar o change event — sem click handler manual.
    var checkboxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');
    checkboxes.forEach(function (cb) {
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
