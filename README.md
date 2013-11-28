# Japanese Flashcards

This is a Chrome extension (for now) that aims at quizzing people with flashcards (Japanese for now).
It started off as a self-educational tool to easily learn the words from Ken Cannon's [Japanese Through Anime Course](http://www.japanesethroughanime.com) and you can display, edit, add your own flashcards, your own structure and it is meant to be highly customizable.

## How it works
* At anytime while browsing you can press `N` to get a new flashcard set. You can continue to press `N` to get the next hint and the next flashcard when all the hints are shown. Or alternatively, clicking on a flashcard has the same effect
* You can press `I` to remove all flashcards
* Click the icon in your browser to customize the options or request a new flashcard set.

## Adding new flashcards
* Go to the options page (click the extension icon OR via chrome://extensions)
* Go to the "Add New Flashcards" section
* Add your flashcards as JSON format. Most fields are optional and if you add new fields they will automatically be taken into account.
* You can check the syntax for all flashcards in: [the flashcards.json file](https://github.com/smirea/extension-flashcards/blob/master/flashcards.json)
* Sample flashcards JSON for 3 flashcards (Omae, Ore, Wakaru):

    ```json
    [
      {
        "category": "JTA - Lesson 1",
        "English": "You",
        "Romaji": "Omae",
        "Hiragana": "おまえ",
        "Katakana": "オマエ",
        "story": "The ugliest, most hideous person you can think of.",
        "phrase": "“OH MY god, YOU are really ugly”"
      },
      {
        "category": "JTA - Lesson 1",
        "English": "I/Me",
        "Romaji": "Ore",
        "Hiragana": "おれ",
        "Katakana": "オレ",
        "story": "Poor Orphan boy asks British man for money, and then gets buried under mountain of money.",
        "phrase": "“OH REally?, I don’t have much…”"
      },
      {
        "category": "JTA - Lesson 1",
        "English": "To understand",
        "Romaji": "Wakaru",
        "Hiragana": "わかる",
        "Katakana": "ワカル",
        "story": "Playing a game called wack-a-roo, but every time you try to, they kick you in the face.",
        "phrase": "“I don’t UNDERSTAND how were supposed to WACK A ROO!”"
      }
    ]
    ```
