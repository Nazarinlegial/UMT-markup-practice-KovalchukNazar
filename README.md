# Flora — UMT markup practice

[English](#english) | [Українська](#українська)

## Live repo

https://github.com/Nazarinlegial/UMT-markup-practice-KovalchukNazar

## Design source (Figma)

https://www.figma.com/design/2Tj16H7IO7dq1ViTvIh57V/Flora

---

## English

A practice project for the UMT course: turning the Flora flower-shop Figma mock-up into clean HTML and CSS.

### What the page contains

- Navbar — brand logo, main menu, call-to-action button
- Hero — large intro banner with a headline, short copy and a button
- About — "Our Passion for Floral Artistry" block paired with a photo
- Top-Selling Bouquets — a 3-item carousel with dot indicators and arrows
- Bouquets — a 4×2 product grid with a "Show More" button
- Feedback — three testimonial cards with prev/next arrows
- Contacts — phone and address details next to an image
- Footer — logo, repeated navigation, social icons and copyright

### Tech stack

- Semantic HTML5
- Vanilla CSS (no preprocessor), Flexbox-driven layout
- `modern-normalize` loaded from a CDN
- Google Fonts: Hanuman and Roboto
- Icons served from a single SVG sprite

### Project layout

```
.
├── index.html
├── styles/
│   ├── reset.css      # custom reset layered on top of normalize
│   ├── colors.css     # colour custom properties
│   ├── fonts.css      # font-size custom properties
│   └── styles.css     # main stylesheet
├── images/            # photos used across sections
└── icons/
    └── sprite.svg     # bundled SVG icons
```

### Running it locally

Just open `index.html` in a browser — there is no build step.

---

## Українська

Практична робота курсу UMT: перенесення макету квіткового магазину Flora з Figma у HTML та CSS.

### Що на сторінці

- Navbar — логотип бренду, основне меню та кнопка дії
- Hero — великий банер із заголовком, коротким текстом і кнопкою
- About — блок "Our Passion for Floral Artistry" із фотографією
- Top-Selling Bouquets — карусель із трьох товарів, індикатори-крапки та стрілки
- Bouquets — сітка товарів 4×2 із кнопкою "Show More"
- Feedback — три картки відгуків зі стрілками вперед/назад
- Contacts — телефон і адреса поруч із зображенням
- Footer — логотип, дубльована навігація, іконки соцмереж і копірайт

### Технології

- Семантичний HTML5
- Звичайний CSS (без препроцесорів), верстка на Flexbox
- `modern-normalize`, підключений через CDN
- Шрифти Google Fonts: Hanuman та Roboto
- Іконки зібрані в один SVG-спрайт

### Структура проєкту

```
.
├── index.html
├── styles/
│   ├── reset.css      # власний скид поверх normalize
│   ├── colors.css     # змінні кольорів
│   ├── fonts.css      # змінні розмірів шрифту
│   └── styles.css     # основна таблиця стилів
├── images/            # фотографії для секцій
└── icons/
    └── sprite.svg     # зібрані SVG-іконки
```

### Локальний запуск

Просто відкрийте `index.html` у браузері — збірка не потрібна.
