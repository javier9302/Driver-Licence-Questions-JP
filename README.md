# JP Driver's Licence Study

A small, dependency-free web app for studying the True/False questions of the Japanese
driver's licence **learner's permit** test (仮免許 学科試験).

## Features
- **Practice in order** / **Random practice** – instant feedback with the official explanation
- **Mock exam** – random order, score at the end (pass mark 90%)
- **Review mistakes** – repeats only the questions you got wrong last time
- **Browse answers** – every question with answer and explanation
- Progress is saved in your browser; works on phone and desktop, light and dark mode
- Keyboard: `T`/`1` = True, `F`/`2` = False, `Enter`/`→` = next, `←` = back

## Run
Open `index.html` in a browser – no build step needed.
To use it on your phone, enable **GitHub Pages** (Settings → Pages → deploy from branch).

## Adding more question sets
Add another object to `QUESTION_SETS` in `questions.js` (`id`, `title`, `questions`).
Each question is `{ n, q, a, e, img? }` where `a` is `true` (True) or `false` (False).
Figures live in `img/`. A set selector appears automatically when there is more than one set.
