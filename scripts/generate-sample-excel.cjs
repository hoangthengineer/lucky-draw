const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const rows = [
  ["Mã nhân viên", "Họ tên"],
  ["NV001", "Nguyễn Văn An"],
  ["NV002", "Trần Thị Bình"],
  ["NV003", "Lê Hoàng Cường"],
  ["NV004", "Phạm Minh Đức"],
  ["NV005", "Hoàng Thu Hà"],
  ["NV006", "Vũ Đình Khôi"],
  ["NV007", "Đỗ Thị Lan"],
  ["NV008", "Bùi Xuân Minh"],
  ["NV009", "Đặng Thu Nga"],
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(rows);

// Column widths
ws["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 28 }];

XLSX.utils.book_append_sheet(wb, ws, "Participants");

const outDir = path.join(__dirname, "..");
const outPath = path.join(outDir, "participants-sample.xlsx");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
XLSX.writeFile(wb, outPath);

console.log("Created:", outPath);
