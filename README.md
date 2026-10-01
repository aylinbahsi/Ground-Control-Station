# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      

      
      tseslint.configs.recommendedTypeChecked,
      
      tseslint.configs.strictTypeChecked,
      
      tseslint.configs.stylisticTypeChecked,

     
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js

import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      
      reactX.configs['recommended-typescript'],
     
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    
    },
  },
])
```
🚀 Quick Start

### 1. Start the Central WebSocket Server
```bash
node server.cjs
```
*(Server will start on port 5000)*

### 2. Start the React Dashboard
```bash
npm install
npm run dev
```
*(Open http://localhost:5173 in your browser)*

### 3. Start the Drone & AI Systems (Python)
Ensure you have the required Python libraries (`pymavlink`, `ultralytics`, `websockets`, `opencv-python`).
```bash
# To run the MAVLink drone simulator:
python drone_sim.py

# To run the AI Camera Bridge (make sure you have your .pt models):
python tulpar_ai_bridge.py
```

## 📜 License

This project is open-source and available for educational and research purposes.
