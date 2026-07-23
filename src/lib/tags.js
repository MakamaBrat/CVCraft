// Теги-підказки для навичок у резюме та тегів вакансій, згруповані за
// галузевими категоріями. Один і той самий набір ID категорій та тегів
// для всіх мов (uk/ru/en) — перекладаються лише підписи, щоб теги
// вакансій завжди відповідали навичкам у резюме незалежно від мови.

export const CATEGORY_ORDER = [
  "it", "design", "admin", "construction", "accounting", "hospitality",
  "media", "beauty", "culture", "logistics", "marketing", "medicine",
  "realestate", "education", "security", "sales", "trades", "retail",
  "secretariat", "agriculture", "insurance", "service", "telecom",
  "topmanagement", "transport", "hr", "finance", "law",
];

export const TAG_CATEGORIES = {
  uk: {
    it: { label: "IT, комп'ютери, інтернет", tags: [
      "Frontend-розробка", "Backend-розробка", "Fullstack-розробка", "JavaScript", "TypeScript",
      "React", "Vue.js", "Angular", "Node.js", "Python", "Java", "PHP", "C#/.NET", "Go",
      "iOS-розробка", "Android-розробка", "Flutter/React Native", "DevOps", "SQL, бази даних",
      "Data Science, аналітика даних", "Machine Learning, AI", "Кібербезпека", "Системне адміністрування",
      "QA-тестування", "QA-автоматизація", "Технічна підтримка", "Product Manager (IT)",
      "Project Manager (IT)", "1С-програмування", "Розробка ігор",
    ] },
    design: { label: "Дизайн, творчість", tags: [
      "UI/UX дизайн", "Графічний дизайн", "Веб-дизайн", "Figma", "Adobe Photoshop",
      "Adobe Illustrator", "Adobe InDesign", "Брендинг, розробка логотипів", "Моушн-дизайн",
      "3D-моделювання", "Ілюстрація", "Дизайн упаковки", "Поліграфічний дизайн", "Fashion-дизайн",
      "Промисловий дизайн", "Дизайн інтер'єру", "Дизайн презентацій", "Ландшафтний дизайн",
      "Арт-дирекшн", "Прототипування",
    ] },
    admin: { label: "Адміністрація, керівництво середньої ланки", tags: [
      "Керівництво відділом", "Операційний менеджмент", "Стратегічне планування", "Звітність",
      "Контроль якості", "Бюджетування", "Управління проєктами", "Оптимізація процесів",
      "KPI та мотивація персоналу", "Ведення переговорів", "Крос-функціональна взаємодія",
      "Постановка завдань", "Аналіз ефективності", "Управління змінами",
    ] },
    construction: { label: "Будівництво, архітектура", tags: [
      "Проєктування будівель", "AutoCAD", "ArchiCAD", "Revit (BIM)", "Кошторисна документація",
      "Будівельний нагляд", "Ремонтні роботи", "Дизайн інтер'єру", "Оздоблювальні роботи",
      "Електромонтажні роботи", "Сантехнічні роботи", "Земляні та бетонні роботи",
      "Управління будівельними проєктами", "Технічний нагляд", "Геодезія",
    ] },
    accounting: { label: "Бухгалтерія, аудит", tags: [
      "1С:Бухгалтерія", "Податковий облік", "Фінансова звітність", "Аудит", "МСФЗ",
      "Розрахунок заробітної плати", "Управлінський облік", "Первинна документація",
      "Банківські операції", "Складання балансу", "Робота з ФОП", "Казначейство",
      "Бюджетний облік", "Консолідована звітність",
    ] },
    hospitality: { label: "Готельно-ресторанний бізнес, туризм", tags: [
      "Обслуговування гостей", "Бариста", "Кухар", "Кондитер", "Офіціант",
      "Адміністрування готелю", "Ресепшн", "Хаускіпінг (прибирання номерів)",
      "Туристичний супровід", "Розробка турів", "Event-менеджмент", "Ресторанний менеджмент",
      "Бронювання та бронь-системи", "Кейтеринг", "Сомельє",
    ] },
    media: { label: "ЗМІ, видавництво, поліграфія", tags: [
      "Копірайтинг", "Редагування текстів", "Верстка", "Журналістика", "SMM",
      "Продюсування контенту", "Сценарій та драматургія", "Фотографія", "Відеомонтаж",
      "PR-тексти", "Контент-маркетинг", "Ведення блогу", "Коректура",
    ] },
    beauty: { label: "Краса, фітнес, спорт", tags: [
      "Перукарське мистецтво", "Колористика", "Манікюр", "Педикюр", "Нарощування вій",
      "Масаж", "Персональний тренер", "Йога-інструктор", "Косметологія", "Візаж",
      "Спа-процедури", "Тату та перманентний макіяж", "Фітнес-тренування",
    ] },
    culture: { label: "Культура, музика, шоу-бізнес", tags: [
      "Вокал", "Хореографія", "Звукорежисура", "Організація подій", "Акторська майстерність",
      "Музичний продакшн", "Диджеїнг", "Кураторство виставок", "Сценічна режисура",
      "Оркестрування", "Танцювальне мистецтво", "Циркове мистецтво",
    ] },
    logistics: { label: "Логістика, склад, ЗЕД", tags: [
      "Складський облік", "ЗЕД", "Митне оформлення", "Управління поставками",
      "Логістичне планування", "Excel", "Транспортна логістика", "Управління запасами (WMS)",
      "Диспетчеризація вантажів", "Міжнародна логістика", "Тарифікація перевезень", "Фулфілмент",
    ] },
    marketing: { label: "Маркетинг, реклама, PR", tags: [
      "SMM", "Таргетована реклама", "SEO", "Веб-аналітика", "Брендинг", "PR-комунікації",
      "Контент-маркетинг", "Email-маркетинг", "Performance-маркетинг", "Google Ads",
      "Маркетингові дослідження", "Продуктовий маркетинг", "Івент-маркетинг", "Інфлюенс-маркетинг",
    ] },
    medicine: { label: "Медицина, фармацевтика", tags: [
      "Клінічна практика", "Догляд за пацієнтами", "Фармацевтичний облік", "Медсестринство",
      "Стоматологія", "Діагностика", "Хірургія", "Педіатрія", "Реабілітологія",
      "Лабораторна діагностика", "Фармацевтичний продаж", "Психотерапія", "Ветеринарія",
    ] },
    realestate: { label: "Нерухомість", tags: [
      "Продаж нерухомості", "Оренда", "Оцінка нерухомості", "Ріелторський супровід",
      "Переговори", "Юридичний супровід угод", "Управління нерухомістю", "Комерційна нерухомість",
      "Первинний ринок (новобудови)", "Іпотечне консультування",
    ] },
    education: { label: "Освіта, наука", tags: [
      "Викладання", "Розробка навчальних програм", "Репетиторство", "Наукові дослідження",
      "Онлайн-навчання", "Дитяча психологія", "Логопедія", "Дошкільна освіта",
      "Методична робота", "Тренерство (soft skills)", "Викладання іноземних мов", "Наставництво (менторство)",
    ] },
    security: { label: "Охорона, безпека", tags: [
      "Фізична охорона", "Відеоспостереження", "Пожежна безпека", "Охорона праці",
      "Інкасація", "Служба безпеки", "Кінологія (охоронні собаки)", "Особиста охорона (тілоохоронець)",
      "Розслідування інцидентів", "Пропускний режим",
    ] },
    sales: { label: "Продаж, закупівля", tags: [
      "Активні продажі", "Холодні дзвінки", "Ведення переговорів", "Закупівлі", "CRM",
      "B2B-продажі", "B2C-продажі", "Продажі по телефону", "Тендерні закупівлі",
      "Робота з ключовими клієнтами (KAM)", "Розвиток дилерської мережі", "Продажі на маркетплейсах",
    ] },
    trades: { label: "Робочі спеціальності, виробництво", tags: [
      "Верстатник", "Зварювання", "Слюсарні роботи", "Контроль якості на виробництві",
      "Електромонтаж", "Обслуговування обладнання", "Столярні роботи", "Швейне виробництво",
      "Робота на конвеєрі", "Наладка обладнання", "Токарна справа", "Водій навантажувача",
    ] },
    retail: { label: "Роздрібна торгівля", tags: [
      "Консультування клієнтів", "Мерчандайзинг", "Каса", "Управління магазином",
      "Інвентаризація", "Обслуговування клієнтів", "Викладка товару", "Робота з постачальниками",
      "Продавець-консультант", "Директор магазину", "Товарознавство",
    ] },
    secretariat: { label: "Секретаріат, діловодство, АГВ", tags: [
      "Діловодство", "Ведення документообігу", "Організація зустрічей", "Офісний менеджмент",
      "Робота з оргтехнікою", "Ділове листування", "Ведення протоколів", "Робота з архівом",
      "Помічник керівника", "Тревел-підтримка",
    ] },
    agriculture: { label: "Сільське господарство, агробізнес", tags: [
      "Агрономія", "Тваринництво", "Управління фермою", "Механізація сільгоспробіт",
      "Землеробство", "Ветеринарія", "Птахівництво", "Садівництво", "Агротехнології",
      "Зберігання врожаю", "Робота з сільгосптехнікою",
    ] },
    insurance: { label: "Страхування", tags: [
      "Страхове консультування", "Оцінка ризиків", "Продаж страхових полісів",
      "Врегулювання збитків", "Актуарні розрахунки", "Автострахування", "Медичне страхування", "Перестрахування",
    ] },
    service: { label: "Сфера обслуговування", tags: [
      "Клієнтський сервіс", "Прибирання", "Доставка", "Побутові послуги", "Ресепшн",
      "Кол-центр", "Служба підтримки", "Клінінгові послуги", "Служба таксі", "Прачечні послуги",
    ] },
    telecom: { label: "Телекомунікації та зв'язок", tags: [
      "Налаштування мереж", "Технічна підтримка", "Телекомунікаційне обладнання",
      "Обслуговування абонентів", "IP-телефонія", "Монтаж зв'язку", "Оптоволоконні мережі",
      "Радіозв'язок", "Супутниковий зв'язок",
    ] },
    topmanagement: { label: "Топменеджмент, керівництво вищої ланки", tags: [
      "Стратегічне управління", "P&L відповідальність", "Управління командою", "Розвиток бізнесу",
      "Прийняття рішень", "Антикризовий менеджмент", "M&A угоди", "Корпоративне управління",
      "Побудова організаційної структури", "Управління змінами",
    ] },
    transport: { label: "Транспорт, автобізнес", tags: [
      "Керування транспортом", "Логістика перевезень", "Диспетчеризація", "Обслуговування автопарку",
      "Категорія B/C/D", "Міжнародні перевезення", "Таксі-водій", "Кур'єрська доставка",
      "Морські перевезення", "Авіаперевезення",
    ] },
    hr: { label: "Управління персоналом, HR", tags: [
      "Рекрутинг", "Кадрове діловодство", "HR-адміністрування", "Навчання персоналу",
      "Оцінка персоналу", "Employer Branding", "C&B (компенсації та пільги)", "HR-аналітика",
      "Адаптація персоналу (onboarding)", "Організаційний розвиток",
    ] },
    finance: { label: "Фінанси, банк", tags: [
      "Фінансовий аналіз", "Банківські операції", "Кредитування", "Бюджетування",
      "Інвестиційний аналіз", "Ризик-менеджмент", "Казначейство", "Фінансове моделювання",
      "Робота з цінними паперами", "Валютні операції",
    ] },
    law: { label: "Юриспруденція", tags: [
      "Договірне право", "Судове представництво", "Корпоративне право", "Юридичний супровід бізнесу",
      "Трудове право", "Комплаєнс", "Інтелектуальна власність", "Міжнародне право",
      "Нотаріальна практика", "Кримінальне право",
    ] },
  },
  ru: {
    it: { label: "IT, компьютеры, интернет", tags: [
      "Frontend-разработка", "Backend-разработка", "Fullstack-разработка", "JavaScript", "TypeScript",
      "React", "Vue.js", "Angular", "Node.js", "Python", "Java", "PHP", "C#/.NET", "Go",
      "iOS-разработка", "Android-разработка", "Flutter/React Native", "DevOps", "SQL, базы данных",
      "Data Science, аналитика данных", "Machine Learning, AI", "Кибербезопасность", "Системное администрирование",
      "QA-тестирование", "QA-автоматизация", "Техническая поддержка", "Product Manager (IT)",
      "Project Manager (IT)", "1С-программирование", "Разработка игр",
    ] },
    design: { label: "Дизайн, творчество", tags: [
      "UI/UX дизайн", "Графический дизайн", "Веб-дизайн", "Figma", "Adobe Photoshop",
      "Adobe Illustrator", "Adobe InDesign", "Брендинг, разработка логотипов", "Моушн-дизайн",
      "3D-моделирование", "Иллюстрация", "Дизайн упаковки", "Полиграфический дизайн", "Fashion-дизайн",
      "Промышленный дизайн", "Дизайн интерьера", "Дизайн презентаций", "Ландшафтный дизайн",
      "Арт-дирекшн", "Прототипирование",
    ] },
    admin: { label: "Администрация, руководство среднего звена", tags: [
      "Руководство отделом", "Операционный менеджмент", "Стратегическое планирование", "Отчётность",
      "Контроль качества", "Бюджетирование", "Управление проектами", "Оптимизация процессов",
      "KPI и мотивация персонала", "Ведение переговоров", "Кросс-функциональное взаимодействие",
      "Постановка задач", "Анализ эффективности", "Управление изменениями",
    ] },
    construction: { label: "Строительство, архитектура", tags: [
      "Проектирование зданий", "AutoCAD", "ArchiCAD", "Revit (BIM)", "Сметная документация",
      "Строительный надзор", "Ремонтные работы", "Дизайн интерьера", "Отделочные работы",
      "Электромонтажные работы", "Сантехнические работы", "Земляные и бетонные работы",
      "Управление строительными проектами", "Технический надзор", "Геодезия",
    ] },
    accounting: { label: "Бухгалтерия, аудит", tags: [
      "1С:Бухгалтерия", "Налоговый учёт", "Финансовая отчётность", "Аудит", "МСФО",
      "Расчёт заработной платы", "Управленческий учёт", "Первичная документация",
      "Банковские операции", "Составление баланса", "Работа с ФЛП", "Казначейство",
      "Бюджетный учёт", "Консолидированная отчётность",
    ] },
    hospitality: { label: "Гостинично-ресторанный бизнес, туризм", tags: [
      "Обслуживание гостей", "Бариста", "Повар", "Кондитер", "Официант",
      "Администрирование отеля", "Ресепшн", "Хаускипинг (уборка номеров)",
      "Туристическое сопровождение", "Разработка туров", "Ивент-менеджмент", "Ресторанный менеджмент",
      "Бронирование и бронь-системы", "Кейтеринг", "Сомелье",
    ] },
    media: { label: "СМИ, издательство, полиграфия", tags: [
      "Копирайтинг", "Редактирование текстов", "Вёрстка", "Журналистика", "SMM",
      "Продюсирование контента", "Сценарий и драматургия", "Фотография", "Видеомонтаж",
      "PR-тексты", "Контент-маркетинг", "Ведение блога", "Корректура",
    ] },
    beauty: { label: "Красота, фитнес, спорт", tags: [
      "Парикмахерское искусство", "Колористика", "Маникюр", "Педикюр", "Наращивание ресниц",
      "Массаж", "Персональный тренер", "Йога-инструктор", "Косметология", "Визаж",
      "Спа-процедуры", "Тату и перманентный макияж", "Фитнес-тренировки",
    ] },
    culture: { label: "Культура, музыка, шоу-бизнес", tags: [
      "Вокал", "Хореография", "Звукорежиссура", "Организация мероприятий", "Актёрское мастерство",
      "Музыкальный продакшн", "Диджеинг", "Кураторство выставок", "Сценическая режиссура",
      "Оркестровка", "Танцевальное искусство", "Цирковое искусство",
    ] },
    logistics: { label: "Логистика, склад, ВЭД", tags: [
      "Складской учёт", "ВЭД", "Таможенное оформление", "Управление поставками",
      "Логистическое планирование", "Excel", "Транспортная логистика", "Управление запасами (WMS)",
      "Диспетчеризация грузов", "Международная логистика", "Тарификация перевозок", "Фулфилмент",
    ] },
    marketing: { label: "Маркетинг, реклама, PR", tags: [
      "SMM", "Таргетированная реклама", "SEO", "Веб-аналитика", "Брендинг", "PR-коммуникации",
      "Контент-маркетинг", "Email-маркетинг", "Performance-маркетинг", "Google Ads",
      "Маркетинговые исследования", "Продуктовый маркетинг", "Ивент-маркетинг", "Инфлюенс-маркетинг",
    ] },
    medicine: { label: "Медицина, фармацевтика", tags: [
      "Клиническая практика", "Уход за пациентами", "Фармацевтический учёт", "Сестринское дело",
      "Стоматология", "Диагностика", "Хирургия", "Педиатрия", "Реабилитология",
      "Лабораторная диагностика", "Фармацевтические продажи", "Психотерапия", "Ветеринария",
    ] },
    realestate: { label: "Недвижимость", tags: [
      "Продажа недвижимости", "Аренда", "Оценка недвижимости", "Риелторское сопровождение",
      "Переговоры", "Юридическое сопровождение сделок", "Управление недвижимостью", "Коммерческая недвижимость",
      "Первичный рынок (новостройки)", "Ипотечное консультирование",
    ] },
    education: { label: "Образование, наука", tags: [
      "Преподавание", "Разработка учебных программ", "Репетиторство", "Научные исследования",
      "Онлайн-обучение", "Детская психология", "Логопедия", "Дошкольное образование",
      "Методическая работа", "Тренерство (soft skills)", "Преподавание иностранных языков", "Наставничество (менторство)",
    ] },
    security: { label: "Охрана, безопасность", tags: [
      "Физическая охрана", "Видеонаблюдение", "Пожарная безопасность", "Охрана труда",
      "Инкассация", "Служба безопасности", "Кинология (охранные собаки)", "Личная охрана (телохранитель)",
      "Расследование инцидентов", "Пропускной режим",
    ] },
    sales: { label: "Продажи, закупки", tags: [
      "Активные продажи", "Холодные звонки", "Ведение переговоров", "Закупки", "CRM",
      "B2B-продажи", "B2C-продажи", "Телефонные продажи", "Тендерные закупки",
      "Работа с ключевыми клиентами (KAM)", "Развитие дилерской сети", "Продажи на маркетплейсах",
    ] },
    trades: { label: "Рабочие специальности, производство", tags: [
      "Станочник", "Сварка", "Слесарные работы", "Контроль качества на производстве",
      "Электромонтаж", "Обслуживание оборудования", "Столярные работы", "Швейное производство",
      "Работа на конвейере", "Наладка оборудования", "Токарное дело", "Водитель погрузчика",
    ] },
    retail: { label: "Розничная торговля", tags: [
      "Консультирование клиентов", "Мерчандайзинг", "Касса", "Управление магазином",
      "Инвентаризация", "Обслуживание клиентов", "Выкладка товара", "Работа с поставщиками",
      "Продавец-консультант", "Директор магазина", "Товароведение",
    ] },
    secretariat: { label: "Секретариат, делопроизводство, АХО", tags: [
      "Делопроизводство", "Ведение документооборота", "Организация встреч", "Офис-менеджмент",
      "Работа с оргтехникой", "Деловая переписка", "Ведение протоколов", "Работа с архивом",
      "Помощник руководителя", "Тревел-поддержка",
    ] },
    agriculture: { label: "Сельское хозяйство, агробизнес", tags: [
      "Агрономия", "Животноводство", "Управление фермой", "Механизация сельхозработ",
      "Земледелие", "Ветеринария", "Птицеводство", "Садоводство", "Агротехнологии",
      "Хранение урожая", "Работа с сельхозтехникой",
    ] },
    insurance: { label: "Страхование", tags: [
      "Страховое консультирование", "Оценка рисков", "Продажа страховых полисов",
      "Урегулирование убытков", "Актуарные расчёты", "Автострахование", "Медицинское страхование", "Перестрахование",
    ] },
    service: { label: "Сфера обслуживания", tags: [
      "Клиентский сервис", "Уборка", "Доставка", "Бытовые услуги", "Ресепшн",
      "Колл-центр", "Служба поддержки", "Клининговые услуги", "Служба такси", "Услуги прачечной",
    ] },
    telecom: { label: "Телекоммуникации и связь", tags: [
      "Настройка сетей", "Техническая поддержка", "Телекоммуникационное оборудование",
      "Обслуживание абонентов", "IP-телефония", "Монтаж связи", "Оптоволоконные сети",
      "Радиосвязь", "Спутниковая связь",
    ] },
    topmanagement: { label: "Топ-менеджмент, руководство высшего звена", tags: [
      "Стратегическое управление", "Ответственность за P&L", "Управление командой", "Развитие бизнеса",
      "Принятие решений", "Антикризисный менеджмент", "Сделки M&A", "Корпоративное управление",
      "Построение организационной структуры", "Управление изменениями",
    ] },
    transport: { label: "Транспорт, автобизнес", tags: [
      "Управление транспортом", "Логистика перевозок", "Диспетчеризация", "Обслуживание автопарка",
      "Категория B/C/D", "Международные перевозки", "Водитель такси", "Курьерская доставка",
      "Морские перевозки", "Авиаперевозки",
    ] },
    hr: { label: "Управление персоналом, HR", tags: [
      "Рекрутинг", "Кадровое делопроизводство", "HR-администрирование", "Обучение персонала",
      "Оценка персонала", "Employer Branding", "C&B (компенсации и льготы)", "HR-аналитика",
      "Адаптация персонала (onboarding)", "Организационное развитие",
    ] },
    finance: { label: "Финансы, банк", tags: [
      "Финансовый анализ", "Банковские операции", "Кредитование", "Бюджетирование",
      "Инвестиционный анализ", "Риск-менеджмент", "Казначейство", "Финансовое моделирование",
      "Работа с ценными бумагами", "Валютные операции",
    ] },
    law: { label: "Юриспруденция", tags: [
      "Договорное право", "Судебное представительство", "Корпоративное право", "Юридическое сопровождение бизнеса",
      "Трудовое право", "Комплаенс", "Интеллектуальная собственность", "Международное право",
      "Нотариальная практика", "Уголовное право",
    ] },
  },
  en: {
    it: { label: "IT, computers, internet", tags: [
      "Frontend Development", "Backend Development", "Fullstack Development", "JavaScript", "TypeScript",
      "React", "Vue.js", "Angular", "Node.js", "Python", "Java", "PHP", "C#/.NET", "Go",
      "iOS Development", "Android Development", "Flutter/React Native", "DevOps", "SQL, Databases",
      "Data Science, Data Analytics", "Machine Learning, AI", "Cybersecurity", "System Administration",
      "QA Testing", "QA Automation", "Technical Support", "Product Manager (IT)",
      "Project Manager (IT)", "1C Development", "Game Development",
    ] },
    design: { label: "Design, creative", tags: [
      "UI/UX Design", "Graphic Design", "Web Design", "Figma", "Adobe Photoshop",
      "Adobe Illustrator", "Adobe InDesign", "Branding, Logo Design", "Motion Design",
      "3D Modeling", "Illustration", "Packaging Design", "Print Design", "Fashion Design",
      "Industrial Design", "Interior Design", "Presentation Design", "Landscape Design",
      "Art Direction", "Prototyping",
    ] },
    admin: { label: "Administration, mid-level management", tags: [
      "Department Management", "Operations Management", "Strategic Planning", "Reporting",
      "Quality Control", "Budgeting", "Project Management", "Process Optimization",
      "KPIs & Staff Motivation", "Negotiation", "Cross-functional Collaboration",
      "Task Delegation", "Performance Analysis", "Change Management",
    ] },
    construction: { label: "Construction, architecture", tags: [
      "Building Design", "AutoCAD", "ArchiCAD", "Revit (BIM)", "Cost Estimation",
      "Construction Supervision", "Renovation", "Interior Design", "Finishing Works",
      "Electrical Installation", "Plumbing", "Earthworks & Concrete",
      "Construction Project Management", "Technical Supervision", "Surveying",
    ] },
    accounting: { label: "Accounting, audit", tags: [
      "1C:Accounting", "Tax Accounting", "Financial Reporting", "Audit", "IFRS",
      "Payroll", "Management Accounting", "Source Documents", "Banking Operations",
      "Balance Sheet Preparation", "Sole Proprietor Accounting", "Treasury",
      "Budget Accounting", "Consolidated Reporting",
    ] },
    hospitality: { label: "Hospitality, restaurants, tourism", tags: [
      "Guest Service", "Barista", "Chef", "Pastry Chef", "Waiter/Server",
      "Hotel Administration", "Front Desk", "Housekeeping", "Tour Guiding", "Tour Development",
      "Event Management", "Restaurant Management", "Booking Systems", "Catering", "Sommelier",
    ] },
    media: { label: "Media, publishing, printing", tags: [
      "Copywriting", "Text Editing", "Layout Design", "Journalism", "SMM",
      "Content Production", "Scriptwriting", "Photography", "Video Editing",
      "PR Writing", "Content Marketing", "Blogging", "Proofreading",
    ] },
    beauty: { label: "Beauty, fitness, sports", tags: [
      "Hairdressing", "Hair Coloring", "Manicure", "Pedicure", "Eyelash Extensions",
      "Massage Therapy", "Personal Training", "Yoga Instruction", "Cosmetology",
      "Makeup Artistry", "Spa Treatments", "Tattoo & Permanent Makeup", "Fitness Coaching",
    ] },
    culture: { label: "Culture, music, show business", tags: [
      "Vocals", "Choreography", "Sound Engineering", "Event Organization", "Acting",
      "Music Production", "DJing", "Exhibition Curation", "Stage Directing",
      "Orchestration", "Dance Arts", "Circus Arts",
    ] },
    logistics: { label: "Logistics, warehouse, foreign trade", tags: [
      "Warehouse Management", "Foreign Trade", "Customs Clearance", "Supply Chain Management",
      "Logistics Planning", "Excel", "Transport Logistics", "Inventory Management (WMS)",
      "Freight Dispatching", "International Logistics", "Freight Rates", "Fulfillment",
    ] },
    marketing: { label: "Marketing, advertising, PR", tags: [
      "SMM", "Targeted Advertising", "SEO", "Web Analytics", "Branding", "PR Communications",
      "Content Marketing", "Email Marketing", "Performance Marketing", "Google Ads",
      "Market Research", "Product Marketing", "Event Marketing", "Influencer Marketing",
    ] },
    medicine: { label: "Medicine, pharmaceuticals", tags: [
      "Clinical Practice", "Patient Care", "Pharmacy Operations", "Nursing", "Dentistry",
      "Diagnostics", "Surgery", "Pediatrics", "Rehabilitation Therapy",
      "Laboratory Diagnostics", "Pharmaceutical Sales", "Psychotherapy", "Veterinary Medicine",
    ] },
    realestate: { label: "Real estate", tags: [
      "Property Sales", "Leasing", "Property Valuation", "Realtor Services", "Negotiation",
      "Deal Legal Support", "Property Management", "Commercial Real Estate",
      "New Developments", "Mortgage Consulting",
    ] },
    education: { label: "Education, science", tags: [
      "Teaching", "Curriculum Development", "Tutoring", "Research", "Online Education",
      "Child Psychology", "Speech Therapy", "Early Childhood Education", "Methodology Development",
      "Soft Skills Training", "Foreign Language Teaching", "Mentoring",
    ] },
    security: { label: "Security, safety", tags: [
      "Physical Security", "CCTV Monitoring", "Fire Safety", "Occupational Safety",
      "Cash Collection", "Security Services", "K9 Security", "Personal Protection (Bodyguard)",
      "Incident Investigation", "Access Control",
    ] },
    sales: { label: "Sales, procurement", tags: [
      "Active Sales", "Cold Calling", "Negotiation", "Procurement", "CRM",
      "B2B Sales", "B2C Sales", "Telesales", "Tender Procurement",
      "Key Account Management", "Dealer Network Development", "Marketplace Sales",
    ] },
    trades: { label: "Skilled trades, manufacturing", tags: [
      "Machine Operation", "Welding", "Fitting/Locksmith Work", "Production Quality Control",
      "Electrical Installation", "Equipment Maintenance", "Carpentry", "Garment Manufacturing",
      "Assembly Line Work", "Equipment Setup", "Lathe Operation", "Forklift Operation",
    ] },
    retail: { label: "Retail", tags: [
      "Customer Consulting", "Merchandising", "Cash Handling", "Store Management",
      "Inventory", "Customer Service", "Product Display", "Supplier Relations",
      "Sales Assistant", "Store Manager", "Merchandise Expertise",
    ] },
    secretariat: { label: "Secretariat, office administration", tags: [
      "Office Administration", "Document Management", "Meeting Coordination", "Office Management",
      "Office Equipment", "Business Correspondence", "Minute Taking", "Archive Management",
      "Executive Assistant", "Travel Support",
    ] },
    agriculture: { label: "Agriculture, agribusiness", tags: [
      "Agronomy", "Livestock Farming", "Farm Management", "Farm Machinery", "Crop Production",
      "Veterinary Care", "Poultry Farming", "Horticulture", "AgTech",
      "Harvest Storage", "Agricultural Equipment Operation",
    ] },
    insurance: { label: "Insurance", tags: [
      "Insurance Consulting", "Risk Assessment", "Policy Sales", "Claims Handling",
      "Actuarial Calculations", "Auto Insurance", "Health Insurance", "Reinsurance",
    ] },
    service: { label: "Service industry", tags: [
      "Customer Service", "Cleaning", "Delivery", "Household Services", "Front Desk",
      "Call Center", "Support Service", "Cleaning Services", "Taxi Service", "Laundry Services",
    ] },
    telecom: { label: "Telecommunications & connectivity", tags: [
      "Network Setup", "Technical Support", "Telecom Equipment", "Subscriber Service",
      "IP Telephony", "Communications Installation", "Fiber Optic Networks",
      "Radio Communications", "Satellite Communications",
    ] },
    topmanagement: { label: "Top management, senior leadership", tags: [
      "Strategic Management", "P&L Ownership", "Team Leadership", "Business Development",
      "Decision Making", "Crisis Management", "M&A Deals", "Corporate Governance",
      "Org Structure Design", "Change Management",
    ] },
    transport: { label: "Transport, automotive business", tags: [
      "Vehicle Operation", "Transport Logistics", "Dispatching", "Fleet Maintenance",
      "Driver's License B/C/D", "International Freight", "Taxi Driving", "Courier Delivery",
      "Sea Freight", "Air Freight",
    ] },
    hr: { label: "HR, personnel management", tags: [
      "Recruitment", "HR Administration", "Personnel Records", "Staff Training",
      "Performance Evaluation", "Employer Branding", "Compensation & Benefits", "HR Analytics",
      "Onboarding", "Organizational Development",
    ] },
    finance: { label: "Finance, banking", tags: [
      "Financial Analysis", "Banking Operations", "Lending", "Budgeting",
      "Investment Analysis", "Risk Management", "Treasury", "Financial Modeling",
      "Securities Trading", "Currency Operations",
    ] },
    law: { label: "Law", tags: [
      "Contract Law", "Litigation", "Corporate Law", "Business Legal Support",
      "Labor Law", "Compliance", "Intellectual Property", "International Law",
      "Notary Practice", "Criminal Law",
    ] },
  },
};

// Пласкі списки категорій-міток (без підтегів) — лишено для сумісності
// зі старими місцями використання, де очікується простий масив рядків.
export const SUGGESTED_TAGS = Object.fromEntries(
  Object.entries(TAG_CATEGORIES).map(([lang, cats]) => [
    lang,
    CATEGORY_ORDER.map((id) => cats[id].label),
  ])
);
