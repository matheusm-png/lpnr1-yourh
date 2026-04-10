/**
 * countdown.js
 * Regressivo até 26/05/2026 00:00:00 (horário de Brasília, UTC-3)
 */

(function () {
  'use strict';

  const TARGET_DATE = new Date('2026-05-26T00:00:00-03:00');

  const els = {
    days:    document.getElementById('countdown-days'),
    hours:   document.getElementById('countdown-hours'),
    minutes: document.getElementById('countdown-minutes'),
    seconds: document.getElementById('countdown-seconds'),
    wrapper: document.getElementById('countdown-wrapper'),
    expired: document.getElementById('countdown-expired'),
  };

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function tick() {
    const now  = new Date();
    const diff = TARGET_DATE - now;

    if (diff <= 0) {
      handleExpired();
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days         = Math.floor(totalSeconds / 86400);
    const hours        = Math.floor((totalSeconds % 86400) / 3600);
    const minutes      = Math.floor((totalSeconds % 3600) / 60);
    const seconds      = totalSeconds % 60;

    if (els.days)    els.days.textContent    = pad(days);
    if (els.hours)   els.hours.textContent   = pad(hours);
    if (els.minutes) els.minutes.textContent = pad(minutes);
    if (els.seconds) els.seconds.textContent = pad(seconds);

    // Urgência visual nos últimos 7 dias
    if (days < 7 && els.wrapper) {
      els.wrapper.classList.add('countdown-urgent');
    }
  }

  function handleExpired() {
    clearInterval(timer);

    if (els.wrapper) els.wrapper.style.display = 'none';
    if (els.expired) {
      els.expired.style.display = 'block';
      els.expired.textContent = 'Prazo encerrado';
    }
  }

  function init() {
    // Verifica se os elementos existem na página
    if (!els.days && !els.hours) return;

    tick(); // Execução imediata para evitar flash de "00"
    var timer = setInterval(tick, 1000);
    // Armazena no escopo da closure para o clearInterval do handleExpired
    window._countdownTimer = timer;
  }

  // Re-executa o clearInterval a partir do timer global
  var timer;

  function reinit() {
    tick();
    timer = setInterval(tick, 1000);
    window._countdownTimer = timer;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reinit);
  } else {
    reinit();
  }
})();
