# 🎡 Lucky Draw

Lucky draw app with a polished UI, smooth wheel animation, and full management features.

## Features

- **Spin wheel with effects**: Animated wheel, pointer, and confetti when a winner is drawn.
- **Save participants & draw history**: Data is stored in the browser (localStorage). Participants and history persist on reload.
- **Prize categories**: Add, edit, remove prizes. Customize **name**, **order**, **color**, and **number of winners** (winners qty) per prize.
- **Import from Excel**: Import `.xlsx` or `.xls`. **Name** column required (e.g. "Tên", "Name"); optional Phone, Email columns.

## Run

```bash
npm install
npm run dev
```

Open the URL shown (e.g. http://localhost:5173).

## Excel format

| Tên        | Điện thoại   | Email           |
|-----------|--------------|-----------------|
| Nguyễn A  | 0901234567   | a@email.com     |
| Trần B    | 0912345678   | b@email.com     |

Column names: **Tên**, **Name** (for name); **Điện thoại**, **Phone**, **SĐT** (phone); **Email**.

## Build

```bash
npm run build
```

File build nằm trong thư mục `dist/`, có thể đưa lên bất kỳ host tĩnh nào.
