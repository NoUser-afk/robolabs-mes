# Sample-файлы для импорта

## Заказы Excel

Файл `test-order-0000001-3-furnaces.xlsx` — тестовый заказ для RoboPulse MES:

- `orderNumber`: `0000001`
- `productCode`: `FURNACE-SAMPLE`
- `productName`: `Печь промышленная`
- `quantity`: `3`
- `dueDate`: `2026-06-30`
- `customer`: `Production sample customer`
- `priority`: `normal`
- `comment`: `RoboPulse MES: 3 печи, заказ 0000001`

Импорт выполняется через вкладку `Импорт Excel` текущего интерфейса. Backend ожидает первый лист `.xlsx`/`.xls` с колонками `orderNumber`, `productCode`, `productName`, `quantity`, `dueDate`, `customer`, `priority`, `comment`; обязательны `orderNumber`, `productCode`, `quantity`.

## Техпроцессы Excel

Файл `techprocess-template.xlsx` — шаблон загрузки технологического процесса номенклатуры.

Workbook содержит два листа:

- `Process` — одна строка с реквизитами техпроцесса: `equipment`, `productCode`, `processId`, `category`, `versionComment`, `notes`, `activate`.
- `Operations` — операции маршрута: `sequence`, `operationId`, `name`, `section`, `level`, `partOrAssembly`, `normHours`, `previousOperationCodes`, `nextOperationCodes`, `groupCapable`, `x`, `y`.

Обязательные поля:

- на листе `Process`: `equipment`, `productCode`;
- на листе `Operations`: `operationId`, `name`, `section`.

Связи операций задаются через `previousOperationCodes` и/или `nextOperationCodes`, несколько кодов разделяются `,`, `;` или переносом строки. Импорт техпроцессов выполняется в интерфейсе номенклатуры через кнопку `Загрузить техпроцесс из Excel`: сначала проверка, затем сохранение черновика или сохранение с активацией версии.
