const newQuoteBtn = document.querySelector('#js-new-quote');
const answerBtn   = document.querySelector('#js-tweet');
const quoteEl     = document.getElementById('js-quote-text');
const answerEl    = document.getElementById('js-answer-text');

const ENDPOINT = 'https://trivia.cyberwisp.com/getrandomchristmasquestion';

let currentTrivia = null;

function displayQuote(text) {
  quoteEl.textContent = text;
}

async function getQuote() {
  console.log('getQuote() called');
  try {
    const res = await fetch(ENDPOINT, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('Fetched trivia:', data);

    currentTrivia = data;
    displayQuote(data.question);
    answerEl.textContent = '';
  } catch (err) {
    console.error('Error fetching trivia:', err);
    alert('Sorry, there was a problem getting a quote.');
  }
}

newQuoteBtn.addEventListener('click', getQuote);

answerBtn.addEventListener('click', () => {
  if (currentTrivia && currentTrivia.answer) {
    answerEl.textContent = currentTrivia.answer;
  } else {
    alert('No trivia loaded yet. Generate one first!');
  }
});

document.addEventListener('DOMContentLoaded', getQuote);
