<p align="center">
  <a href="https://poker.cyberpnkz.net/"><img src="./website/img/timer.png" alt="Timer Screen"></a>
</p>

<p align="center">
  <a href="https://github.com/k44sh/poker"><img src="https://img.shields.io/github/stars/k44sh/poker?logo=github" alt="GitHub Stars"></a>
</p>

---

## About

**Poker Timer** is a web application designed to manage your poker games effortlessly. Track levels, blinds, antes, and game durations in a user-friendly interface. Fully customizable with support for multiple languages.

<p align="center">
  <strong><a href="https://poker.cyberpnkz.net/">ONLINE VERSION</a></strong>
</p>

## Features

- **Customizable Game Levels**:
  - Define small and big blinds, antes, and durations for each level.
  - Add, edit, or remove levels during gameplay.
  - Include breaks with custom durations between levels.

- **Internationalization (i18n)**:
  - Supports 12 languages (English, French, Spanish, Chinese, Arabic, Russian, and more).
  - Automatic language detection based on the user's browser.

- **Persistent Game State**:
  - Automatically saves your game's progress to `localStorage`.
  - Reload your game state when reopening the browser.

- **Audio Notifications**:
  - Alerts for level transitions and breaks.

- **Timer Controls**:
  - Start, pause/resume, skip to next/previous level, or reset the game.

## Multi-Language Support

Poker Timer supports the following languages:
- English
- French
- Spanish
- Chinese
- Arabic
- Russian
- Portuguese
- Hindi
- Italian
- Dutch
- Japanese
- German

You can add custom translations by editing or adding `.json` files in the `lang/` directory.

## How to Customize

Poker Timer ensures a seamless user experience by saving your game settings and progress automatically in the browser.

This functionality is powered by the browser's `localStorage`, allowing you to resume your game or keep your customized configurations intact even after closing or refreshing the page.

<p align="center">
  <a href="https://gitlab.com/cyberpnkz/poker"><img src="./website/img/settings.png" alt="Settings Screen"></a>
</p>

#### How It Works

1. **Default Configuration**:
   - The application loads its initial settings from the `config.json` file when it is first opened.

2. **Changes Made in the App**:
   - Any changes made via the **Settings** (e.g., editing levels, adjusting blinds, adding breaks) are immediately saved in the browser's `localStorage`.
   - These settings and game states (current level, timer progress, etc.) will override the defaults from `config.json` for the duration of the session or upon reopening the application.

3. **Persistent State**:
   - If you reload the page or reopen the browser, Poker Timer will:
     - Load your saved levels, breaks, and game configurations from `localStorage`.
     - Restore the game timer to its last state, including the current level and remaining time.
   - This ensures that you can pick up exactly where you left off without losing any progress.

4. **Original Configuration**:
   - The `config.json` file remains unchanged. If you want to reset the game to the default settings, you can use the "Reset Levels" button in the **Settings** or clear the browser's `localStorage`.

#### Resetting to Defaults

To reset all saved data and return to the default configuration:

1. Open the **Settings**.
2. Click the "Reset Levels" button to reload levels from `config.json`.

### Example Configuration (`config.json`)

The application uses a default configuration file (`config.json`) to define the initial game settings.

This file can be modified to adjust the starting stack, buy-in amount, bounty, rebuy levels, and the default levels for your poker game.

Below is an example of the default `config.json`:

```json
{
  "stack": 5000,
  "buyIn": 100,
  "bounty": 10,
  "rebuyUntilLevel": 4,
  "levels": [
    { "smallBlind": 10, "bigBlind": 20, "ante": 0, "duration": 10 },
    { "smallBlind": 15, "bigBlind": 30, "ante": 5, "duration": 15 }
  ]
}
```

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines.