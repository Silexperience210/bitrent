const fs = require('fs');
const path = require('path');

// Créer le dossier public s'il n'existe pas
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copier les fichiers HTML
const htmlFiles = ['index.html', 'admin.html', 'client.html'];
htmlFiles.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(publicDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file}`);
  }
});

// Copier le dossier libs
const libsSrc = path.join(__dirname, 'libs');
const libsDest = path.join(publicDir, 'libs');
if (fs.existsSync(libsSrc)) {
  if (!fs.existsSync(libsDest)) {
    fs.mkdirSync(libsDest, { recursive: true });
  }
  const files = fs.readdirSync(libsSrc);
  files.forEach(file => {
    fs.copyFileSync(path.join(libsSrc, file), path.join(libsDest, file));
  });
  console.log(`✓ Copied libs directory`);
}

console.log('✓ Build completed - public folder ready for Vercel');
