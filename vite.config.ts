import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages: giả định repo tên "lucky-draw"
// Nếu repo của bạn tên khác, hãy đổi base tương ứng,
// ví dụ repo "quayso" thì dùng base: '/quayso/'.
export default defineConfig({
  plugins: [react()],
  base: "/lucky-draw/",
});
