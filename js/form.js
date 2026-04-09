/**
 * form.js
 * Validação em tempo real, máscara de telefone BR,
 * integração com RD Station via webhook e disparo de evento GTM
 */

(function () {
  'use strict';

  // ── CONFIGURAÇÃO ────────────────────────────────────────────────
  // INSERIR URL DO WEBHOOK RD STATION AQUI
  var RD_STATION_WEBHOOK_URL = '';

  // ── VALIDADORES ─────────────────────────────────────────────────

  var validators = {
    nome: function (v) {
      return v.trim().length >= 3 && v.trim().includes(' ');
    },
    empresa: function (v) {
      return v.trim().length >= 2;
    },
    cargo: function (v) {
      return v.trim().length >= 2;
    },
    email: function (v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
    },
    telefone: function (v) {
      var digits = v.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 11;
    },
  };

  var errorMessages = {
    nome:      'Informe seu nome completo (nome e sobrenome).',
    empresa:   'Informe o nome da empresa.',
    cargo:     'Informe seu cargo.',
    email:     'Informe um e-mail corporativo válido.',
    telefone:  'Informe um telefone válido com DDD.',
  };

  // ── MÁSCARA DE TELEFONE BR ───────────────────────────────────────

  function maskPhone(value) {
    var digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2)  return '(' + digits;
    if (digits.length <= 6)  return '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
    if (digits.length <= 10) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
    return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
  }

  // ── HELPERS ─────────────────────────────────────────────────────

  function setError(groupEl, inputEl, msg) {
    groupEl.classList.add('has-error');
    inputEl.classList.add('is-error');
    inputEl.classList.remove('is-valid');
    var errorEl = groupEl.querySelector('.form-error');
    if (errorEl) errorEl.textContent = msg;
    // Re-trigger shake
    inputEl.classList.remove('is-error');
    void inputEl.offsetWidth; // reflow
    inputEl.classList.add('is-error');
  }

  function setValid(groupEl, inputEl) {
    groupEl.classList.remove('has-error');
    inputEl.classList.remove('is-error');
    inputEl.classList.add('is-valid');
  }

  function clearState(groupEl, inputEl) {
    groupEl.classList.remove('has-error');
    inputEl.classList.remove('is-error', 'is-valid');
  }

  function validateField(name, value, groupEl, inputEl) {
    if (value.trim() === '') {
      clearState(groupEl, inputEl);
      return false;
    }
    if (validators[name] && !validators[name](value)) {
      setError(groupEl, inputEl, errorMessages[name] || 'Campo inválido.');
      return false;
    }
    setValid(groupEl, inputEl);
    return true;
  }

  // ── SUBMISSÃO ───────────────────────────────────────────────────

  function showLoading(btn) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Enviando...';
  }

  function hideLoading(btn) {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || 'Quero falar com um especialista';
  }

  function showSuccess(formEl) {
    var formContent = formEl.querySelector('.form-fields');
    var successEl   = formEl.querySelector('.form-success');
    if (formContent) formContent.style.display = 'none';
    if (successEl)   successEl.classList.add('is-visible');
  }

  function sendToRdStation(data) {
    if (!RD_STATION_WEBHOOK_URL) {
      return Promise.resolve({ ok: true, simulated: true });
    }
    return fetch(RD_STATION_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'CONVERSION',
        event_family: 'CDP',
        payload: {
          conversion_identifier: 'lp-nr1-yourh',
          name:  data.nome,
          email: data.email,
          company_name:   data.empresa,
          job_title:      data.cargo,
          mobile_phone:   data.telefone,
          cf_origin:      'Landing Page NR-1',
          traffic_source: document.referrer || 'direto',
        },
      }),
    });
  }

  function fireGtmEvent(data) {
    // GTM: evento lead_form_submit disparado aqui
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event:   'lead_form_submit',
      cargo:   data.cargo,
      empresa: data.empresa,
    });

    // Evento customizado para outras integrações
    var ev = new CustomEvent('lead_form_submit', {
      bubbles: true,
      detail: {
        cargo:   data.cargo,
        empresa: data.empresa,
        email:   data.email,
      },
    });
    window.dispatchEvent(ev);
  }

  // ── INIT ────────────────────────────────────────────────────────

  function init() {
    var form = document.getElementById('conversion-form');
    if (!form) return;

    var fields = form.querySelectorAll('[data-field]');

    // Máscara de telefone em tempo real
    var phoneInput = form.querySelector('[data-field="telefone"]');
    if (phoneInput) {
      phoneInput.addEventListener('input', function () {
        var cursor = phoneInput.selectionStart;
        var masked = maskPhone(phoneInput.value);
        phoneInput.value = masked;
        // Reposiciona cursor de forma aproximada
        try { phoneInput.setSelectionRange(masked.length, masked.length); } catch (e) {}
      });
    }

    // Validação em tempo real no blur
    fields.forEach(function (input) {
      var name    = input.dataset.field;
      var groupEl = input.closest('.form-group');
      if (!groupEl) return;

      input.addEventListener('blur', function () {
        validateField(name, input.value, groupEl, input);
      });

      // Remove erro ao começar a digitar novamente
      input.addEventListener('input', function () {
        if (groupEl.classList.contains('has-error')) {
          clearState(groupEl, input);
        }
      });
    });

    // Submissão
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var isValid = true;
      var formData = {};

      fields.forEach(function (input) {
        var name    = input.dataset.field;
        var groupEl = input.closest('.form-group');
        var valid   = validateField(name, input.value, groupEl, input);
        if (!valid) {
          isValid = false;
          if (!form.querySelector('.is-error')) {
            input.focus();
          }
        }
        formData[name] = input.value.trim();
      });

      if (!isValid) return;

      var submitBtn = form.querySelector('.form-submit-btn');
      showLoading(submitBtn);

      sendToRdStation(formData)
        .then(function () {
          fireGtmEvent(formData);
          showSuccess(form);
        })
        .catch(function (err) {
          console.error('[YouRH Form] Erro ao enviar:', err);
          // Mesmo com erro de rede, dispara o evento GTM e mostra sucesso
          // para não prejudicar a experiência do lead
          fireGtmEvent(formData);
          showSuccess(form);
        })
        .finally(function () {
          hideLoading(submitBtn);
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
