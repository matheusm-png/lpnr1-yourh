/**
 * form.js
 * Validação em tempo real, máscara telefone BR,
 * integração RD Station API de Conversões, Meta Pixel Lead event
 */

(function () {
  'use strict';

  // ── CONFIGURAÇÃO ────────────────────────────────────────────────
  var RD_API_URL = 'https://api.rd.services/platform/conversions?api_key=2b4d5177951b2aaefe0b7f838559c2d9';

  // Lê UTM params da URL para atribuição correta de origem no RD Station
  function getUtmSource() {
    var params = new URLSearchParams(window.location.search);
    return params.get('utm_source') || params.get('utm_medium') || 'Direto';
  }

  var OBRIGADO_URL = 'obrigado.html';

  // ── VALIDADORES ─────────────────────────────────────────────────
  var validators = {
    nome: function (v) {
      return v.trim().length >= 3 && v.trim().split(' ').length >= 2 && v.trim().split(' ')[1].length >= 1;
    },
    email: function (v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
    },
    telefone: function (v) {
      var d = v.replace(/\D/g, '');
      return d.length >= 10 && d.length <= 11;
    },
    empresa: function (v) {
      return v.trim().length >= 2;
    },
    funcionarios: function (v) {
      return v !== '' && v !== null;
    },
    cargo: function (v) {
      return v !== '' && v !== null;
    },
    lgpd: function (v, el) {
      return el ? el.checked : false;
    },
  };

  var errorMessages = {
    nome:         'Informe seu nome completo (nome e sobrenome).',
    email:        'Informe um e-mail válido.',
    telefone:     'Informe um telefone válido com DDD.',
    empresa:      'Informe o nome da empresa.',
    funcionarios: 'Selecione o número de funcionários.',
    cargo:        'Selecione seu cargo.',
    lgpd:         'Você precisa aceitar a Política de Privacidade.',
  };

  // ── MÁSCARA DE TELEFONE BR ───────────────────────────────────────
  function maskPhone(value) {
    var d = value.replace(/\D/g, '').slice(0, 11);
    if (!d.length) return '';
    if (d.length <= 2)  return '(' + d;
    if (d.length <= 6)  return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  // ── HELPERS DE ESTADO ────────────────────────────────────────────
  function setError(groupEl, inputEl, msg) {
    groupEl.classList.add('has-error');
    inputEl.classList.remove('is-valid');
    inputEl.classList.add('is-error');
    var errorEl = groupEl.querySelector('.form-error');
    if (errorEl) errorEl.textContent = msg;
    // Re-trigger shake
    inputEl.classList.remove('is-error');
    void inputEl.offsetWidth;
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

  function validateField(name, inputEl) {
    var groupEl = inputEl.closest('.form-group');
    if (!groupEl) return true;

    var value = inputEl.value;
    var isValid;

    if (name === 'lgpd') {
      isValid = inputEl.checked;
    } else {
      isValid = value.trim() !== '' && validators[name] && validators[name](value, inputEl);
    }

    if (!isValid) {
      setError(groupEl, inputEl, errorMessages[name] || 'Campo obrigatório.');
      return false;
    }

    setValid(groupEl, inputEl);
    return true;
  }

  // ── LOADING / SUCCESS ────────────────────────────────────────────
  function showLoading(btn) {
    btn.disabled = true;
    btn.dataset.original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Enviando...';
  }

  function hideLoading(btn) {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.original || 'quero falar com um especialista!';
  }

  // ── RD STATION API ───────────────────────────────────────────────
  function sendToRdStation(data) {
    return fetch(RD_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type:   'CONVERSION',
        event_family: 'CDP',
        payload: {
          conversion_identifier: 'lp-nr1-yourh',
          name:                data.nome,
          email:               data.email,
          mobile_phone:        data.telefone,
          company_name:        data.empresa,
          number_of_employees: data.funcionarios,
          job_title:           data.cargo,
          traffic_source:      getUtmSource(),
        },
      }),
    });
  }

  // ── GTM + META PIXEL ─────────────────────────────────────────────
  function fireEvents(data) {
    // GTM: evento lead_form_submit disparado aqui
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event:               'lead_form_submit',
      cargo:               data.cargo,
      empresa:             data.empresa,
      numero_funcionarios: data.funcionarios,
    });

    // Meta Pixel: Lead NÃO disparado aqui — disparado no obrigado.html via PageView
    // Isso evita duplo disparo. O obrigado.html é a fonte de verdade do evento Lead.

    // Evento customizado para outras integrações
    window.dispatchEvent(new CustomEvent('lead_form_submit', {
      bubbles: true,
      detail: { email: data.email, cargo: data.cargo, empresa: data.empresa },
    }));
  }

  // ── INIT ─────────────────────────────────────────────────────────
  function init() {
    var form = document.getElementById('conversion-form');
    if (!form) return;

    // Máscara de telefone
    var phoneInput = form.querySelector('[data-field="telefone"]');
    if (phoneInput) {
      phoneInput.addEventListener('input', function () {
        var masked = maskPhone(phoneInput.value);
        phoneInput.value = masked;
      });
    }

    // Validação no blur para inputs e selects
    var fields = form.querySelectorAll('[data-field]');
    fields.forEach(function (input) {
      var name = input.dataset.field;
      if (name === 'lgpd') return; // checkbox validado no change

      input.addEventListener('blur', function () {
        validateField(name, input);
      });
      input.addEventListener('input', function () {
        var groupEl = input.closest('.form-group');
        if (groupEl && groupEl.classList.contains('has-error')) {
          clearState(groupEl, input);
        }
      });
      // Select: validar no change também
      if (input.tagName === 'SELECT') {
        input.addEventListener('change', function () {
          validateField(name, input);
        });
      }
    });

    // Checkbox LGPD
    var lgpdInput = form.querySelector('[data-field="lgpd"]');
    if (lgpdInput) {
      lgpdInput.addEventListener('change', function () {
        validateField('lgpd', lgpdInput);
      });
    }

    // Submit
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var allValid = true;
      var firstInvalid = null;

      fields.forEach(function (input) {
        var name = input.dataset.field;
        var valid = validateField(name, input);
        if (!valid) {
          allValid = false;
          if (!firstInvalid) firstInvalid = input;
        }
      });

      if (!allValid) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Coleta dados
      var data = {
        nome:         form.querySelector('[data-field="nome"]').value.trim(),
        email:        form.querySelector('[data-field="email"]').value.trim(),
        telefone:     form.querySelector('[data-field="telefone"]').value.trim(),
        empresa:      form.querySelector('[data-field="empresa"]').value.trim(),
        funcionarios: form.querySelector('[data-field="funcionarios"]').value,
        cargo:        form.querySelector('[data-field="cargo"]').value,
      };

      var submitBtn = form.querySelector('.form-submit-btn');
      showLoading(submitBtn);

      sendToRdStation(data)
        .then(function (res) {
          if (res.ok || res.status === 200 || res.status === 201) {
            fireEvents(data);
            window.location.href = OBRIGADO_URL;
          } else {
            throw new Error('Status ' + res.status);
          }
        })
        .catch(function (err) {
          console.error('[YouRH Form] Erro RD Station:', err);
          hideLoading(submitBtn);
          var errorEl = form.querySelector('.form-send-error');
          if (errorEl) {
            errorEl.textContent = 'Erro ao enviar. Tente novamente.';
            errorEl.style.display = 'block';
          }
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
