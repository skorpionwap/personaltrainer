// Importăm funcția saveImageToStorage din configurația Firebase
import { saveImageToStorage } from './firebase-config.js';

let quill;

// Așteptăm ca documentul să fie complet încărcat înainte de a inițializa Quill
document.addEventListener('DOMContentLoaded', function() {
  // Verificăm dacă Quill și ImageResize sunt disponibile
  if (window.Quill && window.ImageResize) {
    // Înregistrează modulul ImageResize cu Quill
    Quill.register('modules/imageResize', window.ImageResize.default);

    // Inițializăm Quill în elementul cu id-ul 'articleContent'
    quill = new Quill('#articleContent', {
      theme: 'snow', // Tema 'snow' este unul dintre temele standard ale Quill
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'], // butoane pentru formatare text
          ['blockquote', 'code-block'], // butoane pentru blocuri de citat și cod
          [{ 'header': 1 }, { 'header': 2 }], // butoane pentru headere
          [{ 'list': 'ordered'}, { 'list': 'bullet' }], // butoane pentru liste
          [{ 'script': 'sub'}, { 'script': 'super' }], // butoane pentru subscript și superscript
          [{ 'indent': '-1'}, { 'indent': '+1' }], // butoane pentru indentare
          [{ 'direction': 'rtl' }], // buton pentru direcție text
          [{ 'size': ['small', false, 'large', 'huge'] }], // butoane pentru mărimea fontului
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }], // dropdown pentru headere
          [{ 'color': [] }, { 'background': [] }], // dropdown-uri pentru culoarea textului și a fundalului
          [{ 'font': [] }], // dropdown pentru tipul de font
          [{ 'align': [] }], // butoane pentru aliniere
          ['clean'], // buton pentru eliminarea formatarei
          ['image'] // buton pentru adăugarea de imagini
        ],
        imageResize: {} // Activează modulul de redimensionare a imaginilor
      }
    });

    // Adaugăm un handler pentru butonul de adăugare a imaginilor din toolbar
    quill.getModule('toolbar').addHandler('image', () => {
      selectLocalImage();
    });
  } else {
    console.error("Quill sau Modulul de Redimensionare a Imaginii Quill nu este încărcat!");
  }
});


// Funcția care deschide un input de tip 'file' pentru selectarea imaginii
function selectLocalImage() {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.click();

  // Odată ce utilizatorul selectează o imagine, încercăm să o încărcăm pe Firebase
  input.onchange = async () => {
    const file = input.files[0];
    if (file && /^image\//.test(file.type)) {
      // Folosim funcția saveImageToStorage pentru a încărca fișierul
      const url = await saveImageToStorage(file);
      // Dacă încărcarea reușește, inserăm imaginea în editor
      insertToEditor(url);
    } else {
      console.warn('Doar imaginile pot fi încărcate.');
    }
  };
}

// Funcția pentru inserarea URL-ului imaginii în Quill editor la poziția cursorului
function insertToEditor(url) {
  const range = quill.getSelection(true);
  quill.insertEmbed(range.index, 'image', url, Quill.sources.USER);
  quill.setSelection(range.index + 1, Quill.sources.SILENT);
}

export { quill };
