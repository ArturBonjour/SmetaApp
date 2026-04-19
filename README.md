# СметаАпп — BIM-lite конструктор строительных смет

> **Нарисуй объект → мгновенно получи смету**

## 🎯 О продукте

СметаАпп — это веб-приложение для строительных компаний, которое заменяет Excel-таблицы на интерактивный 2D-конструктор. Пользователь рисует план здания (баня, дом, гараж), а система автоматически рассчитывает смету в реальном времени.

## ✨ Ключевые возможности

- **2D-конструктор** — рисуй стены, полы, кровлю, окна и двери как в игре
- **Автосмета** — стоимость пересчитывается мгновенно при каждом изменении
- **Библиотека материалов** — 30+ позиций с реальными ценами (брус, газоблок, кровля, инженерия)
- **Шаблоны проектов** — Баня 5×3, Дом 6×8, Гараж 6×4, Дом 8×10
- **Экспорт** — PDF и Excel с профессиональным оформлением
- **Наценка и скидки** — настраиваемые коэффициенты
- **Undo/Redo** — отмена и повтор действий
- **Автосохранение** — данные сохраняются каждые 2 секунды

## 🛠 Технологии

**Frontend**: React 18 + TypeScript + Vite + Konva.js + Zustand + TailwindCSS + Recharts
**Backend**: Node.js + Express + TypeScript + Prisma ORM + SQLite
**Export**: ExcelJS + jsPDF

## 🚀 Быстрый старт

### Требования
- Node.js 18+
- npm 9+

### Установка

```bash
# 1. Установить зависимости и настроить БД
npm run setup

# 2. Запустить в режиме разработки
npm run dev
```

После запуска:
- **Фронтенд**: http://localhost:5173
- **Бэкенд**: http://localhost:3001

### Демо-вход
Email: `demo@smeta.app`
Пароль: `demo123`

Или нажмите кнопку **«Войти в демо-режиме»** на странице входа.

## 📁 Структура проекта

```
├── backend/           # Express + Prisma API
│   ├── src/
│   │   ├── domains/   # Бизнес-логика (auth, projects, catalog, estimation)
│   │   └── lib/       # Утилиты (prisma, auth)
│   └── prisma/        # Схема БД + seed данные
├── frontend/          # React приложение
│   └── src/
│       ├── components/
│       │   ├── Editor/     # 2D конструктор (Konva.js)
│       │   └── Estimation/ # Панель сметы
│       ├── pages/          # Страницы приложения
│       └── store/          # Zustand состояние
└── docker-compose.yml
```

## 🔧 Переменные окружения

```bash
# backend/.env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

## 🐳 Docker

```bash
docker-compose up -d
```

## 📋 API

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/demo` | Демо-вход |
| GET | `/api/projects` | Список проектов |
| POST | `/api/projects` | Создать проект |
| GET | `/api/projects/:id` | Получить проект |
| PUT | `/api/projects/:id/geometry` | Сохранить геометрию + пересчитать смету |
| GET | `/api/catalog` | Библиотека материалов |
| GET | `/api/estimation/:projectId` | Получить смету |
| GET | `/api/estimation/:projectId/export/excel` | Скачать Excel |
| GET | `/api/estimation/:projectId/export/pdf` | Скачать PDF |

## 🗺 Roadmap

- [ ] 3D просмотр (Three.js)
- [ ] Совместная работа (WebSocket)
- [ ] Нормативные базы (ГЭСН, ФЕР)
- [ ] CRM интеграция
- [ ] Автообновление цен от поставщиков
