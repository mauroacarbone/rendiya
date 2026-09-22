const quizData = require('../data/quizQuestions.json');

function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const quizController = {
  simulador: (req, res) => {
    const { meta, questions } = quizData;
    const selected = shuffle(questions).slice(0, meta.questionsPerAttempt);

    res.render('quiz/simulador', {
      title: 'Simulador de examen teórico — RendiYa',
      meta,
      questions: selected,
      totalAvailable: questions.length
    });
  }
};

module.exports = quizController;
