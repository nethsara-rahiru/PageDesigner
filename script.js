const headingUpload = document.getElementById('headingUpload');
const questionUpload = document.getElementById('questionUpload');
const paperContainer = document.getElementById('paperContainer');

const mainTools = document.getElementById('mainTools');
const textTools = document.getElementById('textTools');
const textPosX = document.getElementById('textPosX');
const textPosY = document.getElementById('textPosY');
const textFontSize = document.getElementById('textFontSize');
const textColor = document.getElementById('textColor');
const textBold = document.getElementById('textBold');

let pageCount = 0;
let currentContent = null;
let textModeActive = false;
let selectedTextBox = null;

function createNewPage() {
  pageCount++;
  const page = document.createElement('div');
  page.className = 'page';

  page.style.paddingTop = document.getElementById('marginTop').value + 'mm';
  page.style.paddingBottom = document.getElementById('marginBottom').value + 'mm';
  page.style.paddingLeft = document.getElementById('marginLeft').value + 'mm';
  page.style.paddingRight = document.getElementById('marginRight').value + 'mm';

  const content = document.createElement('div');
  content.className = 'page-content';

  const footer = document.createElement('div');
  footer.className = 'page-footer';

  const footerImg = new Image();
  footerImg.src = 'Footer.png';
  footerImg.style.width = '100%';
  footer.appendChild(footerImg);

  page.appendChild(content);
  page.appendChild(footer);
  paperContainer.appendChild(page);
  return content;
}

function addImageToPaper(source, isBase64 = false) {
  const img = document.createElement('img');
  img.src = isBase64 ? source : URL.createObjectURL(source);

  img.onload = () => {
    currentContent.appendChild(img);
    const page = currentContent.parentElement;
    if (page.scrollHeight > page.clientHeight) {
      currentContent.removeChild(img);
      currentContent = createNewPage();
      currentContent.appendChild(img);
    }
  };
}

headingUpload.addEventListener('change', function () {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      addImageToPaper(e.target.result, true);
    };
    reader.readAsDataURL(file);
  }
});

questionUpload.addEventListener('change', function () {
  Array.from(this.files).forEach(file => {
    addImageToPaper(file);
  });
});

function applyMargins() {
  const top = document.getElementById('marginTop').value + 'mm';
  const bottom = document.getElementById('marginBottom').value + 'mm';
  const left = document.getElementById('marginLeft').value + 'mm';
  const right = document.getElementById('marginRight').value + 'mm';

  const pages = document.querySelectorAll('.page');
  pages.forEach(page => {
    page.style.paddingTop = top;
    page.style.paddingBottom = bottom;
    page.style.paddingLeft = left;
    page.style.paddingRight = right;
  });
}

window.addEventListener('DOMContentLoaded', () => {
  applyMargins();
  currentContent = createNewPage();

  const staticHeader = new Image();
  staticHeader.src = 'Header.png';
  staticHeader.onload = () => {
    addImageToPaper(staticHeader.src, true);
  };
});

// --------- TEXT MODE ----------

function activateTextMode() {
  textModeActive = true;
  const hint = document.getElementById('textHint');
  hint.style.display = 'block';
  hint.style.animation = 'none';
  void hint.offsetWidth;
  hint.style.animation = 'fadeOut 3s ease-out forwards';
}

function openTextTools(textBox) {
  selectedTextBox = textBox;
  mainTools.style.display = 'none';
  textTools.style.display = 'block';

  const leftPx = parseFloat(textBox.style.left || 0);
  const topPx = parseFloat(textBox.style.top || 0);
  const pxToMm = px => (px * 25.4 / 96);

  textPosX.value = pxToMm(leftPx).toFixed(1);
  textPosY.value = pxToMm(topPx).toFixed(1);
  textFontSize.value = parseInt(textBox.style.fontSize) || 14;
  textColor.value = rgbToHex(textBox.style.color || "#000000");
  textBold.checked = textBox.style.fontWeight === "bold";

  textBox.focus();
}

function closeTextTools() {
  selectedTextBox = null;
  mainTools.style.display = 'block';
  textTools.style.display = 'none';
}

function deleteSelectedText() {
  if (selectedTextBox) {
    selectedTextBox.remove();
    selectedTextBox = null;
    closeTextTools();
  }
}

textPosX.addEventListener('input', () => {
  if (!selectedTextBox) return;
  const mmToPx = mm => mm * 96 / 25.4;
  selectedTextBox.style.left = mmToPx(parseFloat(textPosX.value)) + 'px';
});

textPosY.addEventListener('input', () => {
  if (!selectedTextBox) return;
  const mmToPx = mm => mm * 96 / 25.4;
  selectedTextBox.style.top = mmToPx(parseFloat(textPosY.value)) + 'px';
});

textFontSize.addEventListener('input', () => {
  if (selectedTextBox) {
    selectedTextBox.style.fontSize = textFontSize.value + 'px';
  }
});

textColor.addEventListener('input', () => {
  if (selectedTextBox) {
    selectedTextBox.style.color = textColor.value;
  }
});

textBold.addEventListener('change', () => {
  if (selectedTextBox) {
    selectedTextBox.style.fontWeight = textBold.checked ? 'bold' : 'normal';
  }
});

function rgbToHex(rgb) {
  const result = rgb.match(/\d+/g);
  if (!result) return '#000000';
  return (
    '#' +
    result
      .slice(0, 3)
      .map(x => parseInt(x).toString(16).padStart(2, '0'))
      .join('')
  );
}

// ---------- EVENT HANDLING ----------

// Place text
document.addEventListener('click', function (e) {
  if (textModeActive) {
    const clickedPage = e.target.closest('.page');
    if (!clickedPage) return;

    const rect = clickedPage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const textBox = document.createElement('div');
    textBox.className = 'text-box';
    textBox.contentEditable = true;
    textBox.innerText = 'Type here...';
    textBox.style.left = `${x}px`;
    textBox.style.top = `${y}px`;
    textBox.style.position = 'absolute';
    textBox.style.minWidth = '100px';
    textBox.style.fontSize = '14px';
    textBox.style.color = '#000000';
    textBox.style.padding = '4px 8px';
    textBox.style.background = '#fffacd';
    textBox.style.border = '1px solid #ccc';
    textBox.style.cursor = 'text';
    textBox.style.resize = 'both';
    textBox.style.overflow = 'auto';

    clickedPage.appendChild(textBox);
    textModeActive = false;
    return;
  }
});

// Prevent closing tools when clicking inside
document.addEventListener('mousedown', function (e) {
  if (textModeActive) return;

  if (e.target.classList.contains('text-box')) {
    openTextTools(e.target);
    return;
  }

  if (e.target.closest('.toolbar')) {
    return;
  }

  if (selectedTextBox) {
    closeTextTools();
  }
});
