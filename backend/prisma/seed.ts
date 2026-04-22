import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const systemCatalog = [
  // Walls
  { name: 'Брус профилированный 150×150', category: 'wall', unit: 'm2', unitPrice: 3200, description: 'Профилированный брус, стены сруба', isSystem: true },
  { name: 'Брус профилированный 200×200', category: 'wall', unit: 'm2', unitPrice: 4500, description: 'Профилированный брус 200×200, усиленный', isSystem: true },
  { name: 'Каркасная стена 150мм', category: 'wall', unit: 'm2', unitPrice: 2100, description: 'Каркасная стена с утеплением 150мм', isSystem: true },
  { name: 'Газоблок D400 толщ. 300мм', category: 'wall', unit: 'm2', unitPrice: 1850, description: 'Газобетонные блоки + кладка + штукатурка', isSystem: true },
  { name: 'Кирпич красный полнотелый', category: 'wall', unit: 'm2', unitPrice: 3600, description: 'Кирпичная кладка в 1.5 кирпича', isSystem: true },

  // Floor
  { name: 'Деревянный пол на лагах', category: 'floor', unit: 'm2', unitPrice: 2800, description: 'Лаги + утеплитель + доска половая', isSystem: true },
  { name: 'Бетонная стяжка с утеплением', category: 'floor', unit: 'm2', unitPrice: 2200, description: 'Армированная стяжка + пеноплекс 50мм', isSystem: true },
  { name: 'Полы из террасной доски', category: 'floor', unit: 'm2', unitPrice: 3500, description: 'Террасная доска лиственница', isSystem: true },

  // Roof
  { name: 'Металлочерепица Монтеррей', category: 'roof', unit: 'm2', unitPrice: 1800, description: 'Металлочерепица + кровельный пирог + монтаж', isSystem: true },
  { name: 'Мягкая кровля Технониколь', category: 'roof', unit: 'm2', unitPrice: 1500, description: 'Гибкая черепица + подложка + монтаж', isSystem: true },
  { name: 'Профнастил НС-35', category: 'roof', unit: 'm2', unitPrice: 1200, description: 'Профнастил + кровельный пирог', isSystem: true },
  { name: 'Натуральная черепица', category: 'roof', unit: 'm2', unitPrice: 3200, description: 'Керамическая черепица + стропильная система', isSystem: true },

  // Windows
  { name: 'Окно ПВХ 1000×1200', category: 'window', unit: 'pcs', unitPrice: 12000, description: 'Двухкамерный стеклопакет ПВХ + монтаж', isSystem: true },
  { name: 'Окно ПВХ 600×900', category: 'window', unit: 'pcs', unitPrice: 8500, description: 'Двухкамерный стеклопакет ПВХ + монтаж', isSystem: true },
  { name: 'Окно деревянное 1200×1400', category: 'window', unit: 'pcs', unitPrice: 22000, description: 'Деревянное окно со стеклопакетом', isSystem: true },
  { name: 'Слуховое окно 600×600', category: 'window', unit: 'pcs', unitPrice: 9500, description: 'Мансардное/слуховое окно', isSystem: true },

  // Doors
  { name: 'Дверь входная металлическая', category: 'door', unit: 'pcs', unitPrice: 25000, description: 'Входная металлическая дверь + монтаж', isSystem: true },
  { name: 'Дверь межкомнатная', category: 'door', unit: 'pcs', unitPrice: 9000, description: 'Межкомнатная дверь + коробка + монтаж', isSystem: true },
  { name: 'Дверь банная', category: 'door', unit: 'pcs', unitPrice: 15000, description: 'Дверь для бани/сауны + монтаж', isSystem: true },

  // Foundation
  { name: 'Ленточный фундамент мелкозаглубленный', category: 'foundation', unit: 'm2', unitPrice: 4500, description: 'МЗЛФ 400×600мм + армирование', isSystem: true },
  { name: 'Свайно-ростверковый фундамент', category: 'foundation', unit: 'm2', unitPrice: 3800, description: 'Винтовые сваи + ростверк', isSystem: true },
  { name: 'Плита монолитная 200мм', category: 'foundation', unit: 'm2', unitPrice: 5200, description: 'Монолитная плита + армирование + утепление', isSystem: true },
  { name: 'Столбчатый фундамент', category: 'foundation', unit: 'm2', unitPrice: 2800, description: 'Буронабивные столбы для лёгких построек', isSystem: true },

  // Engineering
  { name: 'Электромонтаж (под ключ)', category: 'engineering', unit: 'm2', unitPrice: 800, description: 'Электропроводка, розетки, выключатели, щиток', isSystem: true },
  { name: 'Водоснабжение (ввод в дом)', category: 'engineering', unit: 'pcs', unitPrice: 45000, description: 'Ввод водоснабжения + разводка по дому', isSystem: true },
  { name: 'Канализация (септик)', category: 'engineering', unit: 'pcs', unitPrice: 85000, description: 'Септик + разводка внутри + монтаж', isSystem: true },
  { name: 'Отопление (радиаторы)', category: 'engineering', unit: 'm2', unitPrice: 1200, description: 'Котёл + радиаторы + разводка', isSystem: true },

  // Finishing
  { name: 'Внутренняя отделка вагонкой', category: 'finishing', unit: 'm2', unitPrice: 1800, description: 'Вагонка евро + монтаж на обрешётку', isSystem: true },
  { name: 'Штукатурка стен', category: 'finishing', unit: 'm2', unitPrice: 650, description: 'Машинная штукатурка + грунтовка', isSystem: true },
  { name: 'Покраска фасада', category: 'finishing', unit: 'm2', unitPrice: 450, description: 'Фасадная краска в 2 слоя + грунтовка', isSystem: true },
  { name: 'Утепление фасада ЭППС', category: 'finishing', unit: 'm2', unitPrice: 1400, description: 'Экструзионный пенополистирол 100мм + штукатурка', isSystem: true },
];

const templates = [
  {
    name: 'Баня 5×3',
    description: 'Классическая баня с предбанником и парной',
    preview: '🛁',
    isSystem: true,
    geometryJson: JSON.stringify({
      width: 5,
      height: 3,
      elements: [
        { id: 'w1', type: 'wall', x1: 0, y1: 0, x2: 5, y2: 0, length: 5, height: 2.5, label: 'Передняя стена' },
        { id: 'w2', type: 'wall', x1: 5, y1: 0, x2: 5, y2: 3, length: 3, height: 2.5, label: 'Правая стена' },
        { id: 'w3', type: 'wall', x1: 5, y1: 3, x2: 0, y2: 3, length: 5, height: 2.5, label: 'Задняя стена' },
        { id: 'w4', type: 'wall', x1: 0, y1: 3, x2: 0, y2: 0, length: 3, height: 2.5, label: 'Левая стена' },
        { id: 'w5', type: 'wall', x1: 2, y1: 0, x2: 2, y2: 3, length: 3, height: 2.5, label: 'Внутренняя перегородка' },
        { id: 'f1', type: 'floor', x: 0, y: 0, width: 5, depth: 3, label: 'Пол' },
        { id: 'r1', type: 'roof', x: 0, y: 0, width: 5, depth: 3, label: 'Кровля' },
        { id: 'd1', type: 'door', x: 1, y: 0, label: 'Входная дверь' },
        { id: 'win1', type: 'window', x: 3.5, y: 0, label: 'Окно предбанника' },
        { id: 'win2', type: 'window', x: 3.5, y: 3, label: 'Окно парной' },
      ],
    }),
  },
  {
    name: 'Дом 6×8',
    description: 'Одноэтажный жилой дом с гостиной и 2 спальнями',
    preview: '🏠',
    isSystem: true,
    geometryJson: JSON.stringify({
      width: 6,
      height: 8,
      elements: [
        { id: 'w1', type: 'wall', x1: 0, y1: 0, x2: 6, y2: 0, length: 6, height: 2.7, label: 'Передняя стена' },
        { id: 'w2', type: 'wall', x1: 6, y1: 0, x2: 6, y2: 8, length: 8, height: 2.7, label: 'Правая стена' },
        { id: 'w3', type: 'wall', x1: 6, y1: 8, x2: 0, y2: 8, length: 6, height: 2.7, label: 'Задняя стена' },
        { id: 'w4', type: 'wall', x1: 0, y1: 8, x2: 0, y2: 0, length: 8, height: 2.7, label: 'Левая стена' },
        { id: 'w5', type: 'wall', x1: 0, y1: 4, x2: 6, y2: 4, length: 6, height: 2.7, label: 'Перегородка' },
        { id: 'w6', type: 'wall', x1: 3, y1: 4, x2: 3, y2: 8, length: 4, height: 2.7, label: 'Перегородка спален' },
        { id: 'f1', type: 'floor', x: 0, y: 0, width: 6, depth: 8, label: 'Пол' },
        { id: 'r1', type: 'roof', x: 0, y: 0, width: 6, depth: 8, label: 'Кровля' },
        { id: 'found1', type: 'foundation', x: 0, y: 0, width: 6, depth: 8, label: 'Фундамент' },
        { id: 'd1', type: 'door', x: 2, y: 0, label: 'Входная дверь' },
        { id: 'd2', type: 'door', x: 1, y: 4, label: 'Дверь в спальню 1' },
        { id: 'd3', type: 'door', x: 4, y: 4, label: 'Дверь в спальню 2' },
        { id: 'win1', type: 'window', x: 0.5, y: 0, label: 'Окно гостиной 1' },
        { id: 'win2', type: 'window', x: 4, y: 0, label: 'Окно гостиной 2' },
        { id: 'win3', type: 'window', x: 0, y: 5.5, label: 'Окно спальни 1' },
        { id: 'win4', type: 'window', x: 6, y: 5.5, label: 'Окно спальни 2' },
      ],
    }),
  },
  {
    name: 'Гараж 6×4',
    description: 'Гараж на 1-2 машины с воротами',
    preview: '🚗',
    isSystem: true,
    geometryJson: JSON.stringify({
      width: 6,
      height: 4,
      elements: [
        { id: 'w1', type: 'wall', x1: 0, y1: 0, x2: 6, y2: 0, length: 6, height: 2.8, label: 'Передняя стена' },
        { id: 'w2', type: 'wall', x1: 6, y1: 0, x2: 6, y2: 4, length: 4, height: 2.8, label: 'Правая стена' },
        { id: 'w3', type: 'wall', x1: 6, y1: 4, x2: 0, y2: 4, length: 6, height: 2.8, label: 'Задняя стена' },
        { id: 'w4', type: 'wall', x1: 0, y1: 4, x2: 0, y2: 0, length: 4, height: 2.8, label: 'Левая стена' },
        { id: 'f1', type: 'floor', x: 0, y: 0, width: 6, depth: 4, label: 'Пол (бетон)' },
        { id: 'r1', type: 'roof', x: 0, y: 0, width: 6, depth: 4, label: 'Кровля' },
        { id: 'found1', type: 'foundation', x: 0, y: 0, width: 6, depth: 4, label: 'Фундамент' },
        { id: 'd1', type: 'door', x: 2, y: 0, label: 'Ворота' },
        { id: 'win1', type: 'window', x: 5, y: 0, label: 'Окно' },
      ],
    }),
  },
  {
    name: 'Дом 8×10',
    description: 'Двухэтажный дом с 4 спальнями',
    preview: '🏡',
    isSystem: true,
    geometryJson: JSON.stringify({
      width: 8,
      height: 10,
      elements: [
        { id: 'w1', type: 'wall', x1: 0, y1: 0, x2: 8, y2: 0, length: 8, height: 2.8, label: 'Передняя стена' },
        { id: 'w2', type: 'wall', x1: 8, y1: 0, x2: 8, y2: 10, length: 10, height: 2.8, label: 'Правая стена' },
        { id: 'w3', type: 'wall', x1: 8, y1: 10, x2: 0, y2: 10, length: 8, height: 2.8, label: 'Задняя стена' },
        { id: 'w4', type: 'wall', x1: 0, y1: 10, x2: 0, y2: 0, length: 10, height: 2.8, label: 'Левая стена' },
        { id: 'f1', type: 'floor', x: 0, y: 0, width: 8, depth: 10, label: 'Пол' },
        { id: 'r1', type: 'roof', x: 0, y: 0, width: 8, depth: 10, label: 'Кровля' },
        { id: 'found1', type: 'foundation', x: 0, y: 0, width: 8, depth: 10, label: 'Фундамент' },
        { id: 'd1', type: 'door', x: 3, y: 0, label: 'Входная дверь' },
        { id: 'win1', type: 'window', x: 0.5, y: 0, label: 'Окно 1' },
        { id: 'win2', type: 'window', x: 6, y: 0, label: 'Окно 2' },
        { id: 'win3', type: 'window', x: 0, y: 4, label: 'Окно 3' },
        { id: 'win4', type: 'window', x: 8, y: 4, label: 'Окно 4' },
        { id: 'win5', type: 'window', x: 0, y: 7, label: 'Окно 5' },
        { id: 'win6', type: 'window', x: 8, y: 7, label: 'Окно 6' },
      ],
    }),
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Seed catalog
  for (const item of systemCatalog) {
    await prisma.catalogItem.upsert({
      where: { id: `system-${item.category}-${item.name.replace(/\s+/g, '-').toLowerCase()}` },
      update: item,
      create: { ...item, id: `system-${item.category}-${item.name.replace(/\s+/g, '-').toLowerCase()}` },
    });
  }
  console.log(`✅ Seeded ${systemCatalog.length} catalog items`);

  // Seed templates
  for (const tpl of templates) {
    await prisma.projectTemplate.upsert({
      where: { id: `tpl-${tpl.name.replace(/\s+/g, '-').toLowerCase()}` },
      update: tpl,
      create: { ...tpl, id: `tpl-${tpl.name.replace(/\s+/g, '-').toLowerCase()}` },
    });
  }
  console.log(`✅ Seeded ${templates.length} templates`);

  console.log('🎉 Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
