(function () {
  var cfg = window.RENDIYA_QUIZ;
  if (!cfg || !Array.isArray(cfg.questions) || !cfg.questions.length) {
    return;
  }

  var intro = document.getElementById('quiz-intro');
  var runner = document.getElementById('quiz-runner');
  var result = document.getElementById('quiz-result');
  var indexEl = document.getElementById('quiz-index');
  var totalEl = document.getElementById('quiz-total');
  var timerEl = document.getElementById('quiz-timer');
  var progressEl = document.getElementById('quiz-progress');
  var fillEl = document.getElementById('quiz-progress-fill');
  var topicEl = document.getElementById('quiz-topic');
  var questionEl = document.getElementById('quiz-question');
  var optionsEl = document.getElementById('quiz-options');
  var feedbackEl = document.getElementById('quiz-feedback');
  var nextBtn = document.getElementById('quiz-next');

  var questions = cfg.questions;
  var current = 0;
  var correct = 0;
  var answered = [];
  var locked = false;
  var remaining = cfg.seconds;
  var ticker = null;

  totalEl.textContent = questions.length;

  function formatTime(seconds) {
    var mins = Math.floor(seconds / 60);
    var secs = seconds % 60;
    return mins + ':' + String(secs).padStart(2, '0');
  }

  function tick() {
    remaining -= 1;
    timerEl.textContent = formatTime(Math.max(remaining, 0));
    timerEl.classList.toggle('is-low', remaining <= 60);
    if (remaining <= 0) {
      window.clearInterval(ticker);
      finish(true);
    }
  }

  function renderProgress() {
    var done = Math.round((current / questions.length) * 100);
    fillEl.style.width = done + '%';
    progressEl.setAttribute('aria-valuenow', String(done));
  }

  function renderQuestion() {
    var item = questions[current];
    locked = false;
    indexEl.textContent = current + 1;
    topicEl.textContent = item.topic;
    questionEl.textContent = item.text;
    feedbackEl.hidden = true;
    feedbackEl.className = 'quiz-feedback';
    nextBtn.disabled = true;
    nextBtn.textContent = current === questions.length - 1 ? 'Ver resultado' : 'Siguiente';
    optionsEl.innerHTML = '';

    item.options.forEach(function (option, position) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.textContent = option;
      btn.addEventListener('click', function () {
        pick(position, btn);
      });
      optionsEl.appendChild(btn);
    });

    renderProgress();
  }

  function pick(position, btn) {
    if (locked) return;
    locked = true;

    var item = questions[current];
    var isRight = position === item.answer;
    if (isRight) correct += 1;
    answered.push({ question: item, picked: position, isRight: isRight });

    Array.prototype.forEach.call(optionsEl.children, function (node, i) {
      node.disabled = true;
      if (i === item.answer) node.classList.add('is-right');
      if (i === position && !isRight) node.classList.add('is-wrong');
    });
    btn.setAttribute('aria-checked', 'true');

    feedbackEl.hidden = false;
    feedbackEl.classList.add(isRight ? 'is-right' : 'is-wrong');
    feedbackEl.textContent = (isRight ? 'Correcto. ' : 'Incorrecto. ') + item.explanation;
    nextBtn.disabled = false;
  }

  function reviewHtml() {
    if (!answered.length) return '';
    var rows = answered.filter(function (row) { return !row.isRight; });
    if (!rows.length) {
      return '<p class="quiz-review-title">No tuviste errores. Impecable.</p>';
    }
    var html = '<p class="quiz-review-title">Para repasar</p><ul class="quiz-review-list">';
    rows.forEach(function (row) {
      html += '<li><strong>' + row.question.text + '</strong>'
        + '<span>Correcta: ' + row.question.options[row.question.answer] + '</span>'
        + '<span class="hint">' + row.question.explanation + '</span></li>';
    });
    return html + '</ul>';
  }

  function finish(byTimeout) {
    window.clearInterval(ticker);
    runner.hidden = true;
    result.hidden = false;

    var score = Math.round((correct / questions.length) * 100);
    var passed = score >= cfg.passingScore;
    var verdict = document.getElementById('quiz-verdict');
    var scoreEl = document.getElementById('quiz-score');
    var detail = document.getElementById('quiz-detail');
    var cta = document.getElementById('quiz-cta');

    verdict.textContent = passed ? 'Aprobado' : 'Desaprobado';
    verdict.className = 'quiz-verdict ' + (passed ? 'is-pass' : 'is-fail');
    scoreEl.textContent = correct + ' de ' + questions.length + ' correctas · ' + score + '%';
    detail.textContent = byTimeout
      ? 'Se terminó el tiempo. Se contaron las respuestas que alcanzaste a marcar.'
      : (passed
        ? 'Superaste el ' + cfg.passingScore + '% necesario para aprobar la teoría.'
        : 'Necesitás al menos ' + cfg.passingScore + '% para aprobar. Repasá y probá de nuevo.');

    cta.hidden = !passed;
    document.getElementById('quiz-review').innerHTML = reviewHtml();

    if (passed && typeof window.confetti === 'function') {
      window.confetti({
        particleCount: 120,
        spread: 78,
        startVelocity: 40,
        origin: { y: 0.7 },
        colors: ['#8b5cf6', '#22d3ee', '#3b82f6', '#f4f7ff', '#34d399']
      });
    }

    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.getElementById('quiz-start').addEventListener('click', function () {
    intro.hidden = true;
    runner.hidden = false;
    timerEl.textContent = formatTime(remaining);
    renderQuestion();
    ticker = window.setInterval(tick, 1000);
  });

  nextBtn.addEventListener('click', function () {
    if (current === questions.length - 1) {
      current += 1;
      renderProgress();
      finish(false);
      return;
    }
    current += 1;
    renderQuestion();
  });

  document.getElementById('quiz-retry').addEventListener('click', function () {
    window.location.reload();
  });
})();
