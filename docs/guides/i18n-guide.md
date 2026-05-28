# i18n Guide

How to add or improve translations for the FIRE Calculator.

## Supported Languages

- Portuguese (`locales/pt.json`)
- English (`locales/en.json`)

## Adding a New Language

1. Copy `locales/en.json` to `locales/<code>.json`
2. Translate all values (keep keys unchanged)
3. Add the language option in `src/i18n.js`
4. Test both themes with the new language

## Updating Translations

Edit the corresponding JSON file in `locales/`. Keys must match between all language files.

## Guidelines

- Keep text concise (space is limited in the UI)
- Use familiar financial terms in the target language
- Test with long text (some languages are more verbose)

---

[Back to Documentation](../README.md)
