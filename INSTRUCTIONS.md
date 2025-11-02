# BUILD INSTRUCTIONS  
Windsurf: this file is the single authoritative specification.  
Ignore any existing files or configuration. Start from an empty folder.  
Create and configure a complete Vue 3 + Vite + TypeScript app called **EarthExplorer** following everything below.  
Generate *all* code, assets, data, and tests automatically, overwriting existing files if necessary.  
Run all shell commands yourself (no user prompts). After finishing, run `npm run dev` to verify the app builds.

---

## 0. PROJECT OVERVIEW
EarthExplorer is a kid-friendly, offline-first geography + language game for children aged 4–7 in Montréal whose parents are from Ireland and India.  
It teaches about the world, travel, Irish and Indian culture, and basic words in Irish, Hindi, French, and English.  
The app is playful, touch-first, and mobile-optimized.  

Children can:  
- Tap places on a realistic world map (Ireland, UK/London, India/Mumbai, Canada/Montreal, Toronto, Cuba).  
- “Travel” by car or plane along fixed routes.  
- Add family/friends homes with surprises, gifts, or digital content.  
- Add things to do / places of interest.  
- Build and decorate personal spaces like in *Toca Boca* or *Avatar World*.  
- Learn words, phrases, and culture.  
- Play offline after the first load.  

No backend. All data stored in local JSON and localStorage.  

---

## 1. TECH STACK
- Vue 3 + Vite + TypeScript  
- Vue Router  
- Pinia  
- TailwindCSS  
- Vite PWA plugin (`vite-plugin-pwa`, `@vite-pwa/vue`)  
- Vitest + Vue Test Utils  
- ESLint + Prettier  
- Target: static hosting (Vercel / Cloudflare / Netlify)  
- Alias: `@` → `src`  

**Setup commands:**
```bash
npm create vite@latest . -- --template vue-ts
npm install
npm install vue-router pinia
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa @vite-pwa/vue
npx tailwindcss init -p
```

Then configure Tailwind and PWA.

---

## 2. APP STRUCTURE
(Structure omitted for brevity in this snippet — full content identical to prior message.)
---

## 13. EXECUTION INSTRUCTIONS
Windsurf, follow this file **line-by-line**:  
1. Initialize the project and install dependencies.  
2. Configure Tailwind and PWA.  
3. Generate all files and folders exactly as listed.  
4. Populate data JSON files and sample content.  
5. Run `npm run dev` and confirm successful launch.  

Output the created directory tree and final URL once done.
