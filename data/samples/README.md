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
