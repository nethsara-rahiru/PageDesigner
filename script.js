let pageCount = 0;
let selectedTextBox = null;
const paperContainer = document.getElementById('paperContainer');
let currentContent = null;
let textModeActive = false;

function createNewPage() {
  pageCount++;
  const page = document.createElement('div');
  page.className = 'page';

  page.style.paddingTop = document.getElementById('marginTop').value + 'mm';
  page.style.paddingBottom = document.getElementById('marginBottom').value + 'mm';
  page.style.paddingLeft = document.getElementById('marginLeft').value + 'mm';
  page.style.paddingRight = document.getElementById('marginRight').value + 'mm';

  // Create page content container first
  const content = document.createElement('div');
  content.className = 'page-content';
  content.style.position = 'relative'; // important for absolute positioning inside

  // Add header inside content on first page
  if (pageCount === 1) {
    const header = document.createElement('div');
    header.className = 'page-header';
    header.style.width = '100%';

    const headerImg = new Image();
    headerImg.src = 'Header.png';
    headerImg.style.width = '100%';
    header.appendChild(headerImg);

    content.appendChild(header);
  }

  // Create footer separately (outside content)
  const footer = document.createElement('div');
  footer.className = 'page-footer';

  const footerImg = new Image();
  footerImg.src = 'Footer.png';
  footerImg.style.width = '100%';
  footer.appendChild(footerImg);

  // Append content and footer to page
  page.appendChild(content);
  page.appendChild(footer);

  paperContainer.appendChild(page);

  // Add page number textbox absolutely positioned on page (inside page-content)
  if (pageCount === 1) {
    const pageNumberBox = document.createElement('div');
    pageNumberBox.className = 'text-box page-number-box';
    pageNumberBox.contentEditable = true;
    pageNumberBox.innerText = '01';

    pageNumberBox.style.position = 'absolute';
    pageNumberBox.style.left = '60%';
    pageNumberBox.style.top = '132px';
    pageNumberBox.style.width = '35px';
    pageNumberBox.style.height = '30px';
    pageNumberBox.style.fontSize = '23px';
    pageNumberBox.style.backgroundColor = 'white';
    pageNumberBox.style.color = 'black';
    pageNumberBox.style.border = '1px solid #ccc';
    pageNumberBox.style.fontWeight = 'bold';
    pageNumberBox.style.zIndex = '20';
    pageNumberBox.style.resize = 'none';
    pageNumberBox.style.overflow = 'hidden';

    content.appendChild(pageNumberBox); // append inside content, not page

    makeTextBoxDraggable(pageNumberBox);
    pageNumberBox.addEventListener('click', (ev) => {
      ev.stopPropagation();
      selectTextBox(pageNumberBox);
    });
  }

  return content;
}

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

// Initialize first page on load
window.addEventListener('DOMContentLoaded', () => {
  currentContent = createNewPage();
  console.log('First page created:', currentContent.parentElement);
  applyMargins();

  // Initialize page number input in toolbar if present
  const pageNumberInput = document.getElementById('pageNumberInput');
  if (pageNumberInput) {
    const firstPage = paperContainer.querySelector('.page');
    if (firstPage) {
      const pageNumberBox = firstPage.querySelector('.page-number-box');
      if (pageNumberBox) {
        pageNumberInput.value = pageNumberBox.innerText;
      }
    }

    pageNumberInput.addEventListener('input', () => {
      const firstPage = paperContainer.querySelector('.page');
      if (!firstPage) return;

      const pageNumberBox = firstPage.querySelector('.page-number-box');
      if (!pageNumberBox) return;

      pageNumberBox.innerText = pageNumberInput.value || '01';
    });
  }

  // Setup toolbar listeners for live editing
  setupToolbarListeners();
});

function addImageToPaper(source, isBase64 = false) {
  const img = document.createElement('img');
  img.src = isBase64 ? source : URL.createObjectURL(source);

  img.onload = () => {
    currentContent.appendChild(img);
    const page = currentContent.parentElement;

    const overflow = page.scrollHeight > page.clientHeight;

    if (overflow) {
      currentContent.removeChild(img);
      currentContent = createNewPage();
      currentContent.appendChild(img);
    }
  };
}

// Event listeners for uploads
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

function activateTextMode() {
  textModeActive = true;
  alert("Click anywhere on the page to add text");
}

// Add this listener once, outside activateTextMode
document.addEventListener('click', function (e) {
  if (!textModeActive) return;

  if (
    e.target.closest('.toolbar') || 
    e.target.closest('#textTools') || 
    e.target.closest('.text-box')
  ) return;

  const clickedPage = e.target.closest('.page');
  if (!clickedPage) return;

  const content = clickedPage.querySelector('.page-content');
  if (!content) return;

  const rect = content.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const textBox = document.createElement('div');
  textBox.className = 'text-box';
  textBox.contentEditable = true;
  textBox.innerText = 'Type here...';

  textBox.style.position = 'absolute';
  textBox.style.left = `${x}px`;
  textBox.style.top = `${y}px`;

  content.appendChild(textBox);

  textBox.focus();

  makeTextBoxDraggable(textBox);
  selectTextBox(textBox);

  textModeActive = false;

  textBox.addEventListener('click', (ev) => {
    ev.stopPropagation();
    selectTextBox(textBox);
  });
});

// Helper to select a text box and show toolbar properly
function selectTextBox(textBox) {
  selectedTextBox = textBox;
  setupTextSettings(textBox);
  showTextSettings();
}

function setupTextSettings(textBox) {
  const textTools = document.getElementById('textTools');
  if (!textTools) return;

  // Show toolbar panel
  textTools.style.display = 'block';

  // Populate input fields:
  const posXInput = document.getElementById('textPosX');
  const posYInput = document.getElementById('textPosY');
  const fontSizeInput = document.getElementById('textFontSize');
  const textColorInput = document.getElementById('textColor');
  const bgColorInput = document.getElementById('bgColorPicker');
  const bgTransparentInput = document.getElementById('bgTransparent');
  const textBoldInput = document.getElementById('textBold');

  const style = window.getComputedStyle(textBox);

  posXInput.value = parseInt(textBox.style.left) || 0;
  posYInput.value = parseInt(textBox.style.top) || 0;
  fontSizeInput.value = parseInt(style.fontSize) || 14;
  textColorInput.value = rgbToHex(style.color) || '#000000';

  if (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent') {
    bgTransparentInput.checked = true;
    bgColorInput.disabled = true;
  } else {
    bgTransparentInput.checked = false;
    bgColorInput.disabled = false;
    bgColorInput.value = rgbToHex(style.backgroundColor) || '#ffffff';
  }

  textBoldInput.checked = style.fontWeight === '700' || style.fontWeight === 'bold';
}

// Utility to convert rgb(...) to hex color string
function rgbToHex(rgb) {
  const result = rgb.match(/\d+/g);
  if (!result || result.length < 3) return '#000000';
  return "#" + ((1 << 24) + (parseInt(result[0]) << 16) + (parseInt(result[1]) << 8) + parseInt(result[2])).toString(16).slice(1);
}

function showTextSettings() {
  const textTools = document.getElementById('textTools');
  const mainTools = document.getElementById('mainTools');

  if (textTools) textTools.style.display = 'block';
  if (mainTools) mainTools.style.display = 'none';
}

function closeTextTools() {
  const textTools = document.getElementById('textTools');
  const mainTools = document.getElementById('mainTools');

  if (textTools) textTools.style.display = 'none';
  if (mainTools) mainTools.style.display = 'block';

  selectedTextBox = null;
}

function deleteSelectedText() {
  if (selectedTextBox && selectedTextBox.parentElement) {
    selectedTextBox.parentElement.removeChild(selectedTextBox);
    selectedTextBox = null;

    const textTools = document.getElementById('textTools');
    const mainTools = document.getElementById('mainTools');

    if (textTools) textTools.style.display = 'none';
    if (mainTools) mainTools.style.display = 'block';
  }
}



function makeTextBoxDraggable(textBox) {
  let isDragging = false;
  let offsetX, offsetY;

  textBox.addEventListener('mousedown', (e) => {
    const rect = textBox.getBoundingClientRect();
    const resizeZone = 16;

    if (e.clientX > rect.right - resizeZone && e.clientY > rect.bottom - resizeZone) {
      return; // allow native resize
    }

    isDragging = true;
    offsetX = e.clientX - textBox.offsetLeft;
    offsetY = e.clientY - textBox.offsetTop;

    e.preventDefault();
  });

  const parent = textBox.parentElement;

  textBox.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  function onMouseMove(e) {
    if (!isDragging) return;

    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;

    const maxX = parent.clientWidth - textBox.offsetWidth;
    const maxY = parent.clientHeight - textBox.offsetHeight;

    textBox.style.left = `${Math.min(Math.max(0, newX), maxX)}px`;
    textBox.style.top = `${Math.min(Math.max(0, newY), maxY)}px`;

    // Update toolbar inputs live if selected
    if (selectedTextBox === textBox) {
      const posXInput = document.getElementById('textPosX');
      const posYInput = document.getElementById('textPosY');
      if (posXInput) posXInput.value = Math.round(newX);
      if (posYInput) posYInput.value = Math.round(newY);
    }
  }

  function onMouseUp() {
    isDragging = false;
  }

  textBox.addEventListener('mouseup', onMouseUp);
  parent.addEventListener('mousemove', onMouseMove);
}

// Disable default right-click menu on all .text-box elements globally
document.addEventListener('contextmenu', function (e) {
  if (e.target.classList.contains('text-box')) {
    e.preventDefault();
  }
});

function setupToolbarListeners() {
  const posXInput = document.getElementById('textPosX');
  const posYInput = document.getElementById('textPosY');
  const fontSizeInput = document.getElementById('textFontSize');
  const textColorInput = document.getElementById('textColor');
  const bgColorInput = document.getElementById('bgColorPicker');
  const bgTransparentInput = document.getElementById('bgTransparent');
  const textBoldInput = document.getElementById('textBold');
  const textTools = document.getElementById('textTools');

  if (!textTools) return;

  // Prevent clicks inside toolbar closing text mode or other unintended effects
  textTools.addEventListener('click', e => e.stopPropagation());

  posXInput?.addEventListener('input', e => {
    if (!selectedTextBox) return;
    let val = parseInt(e.target.value);
    if (isNaN(val)) val = 0;
    selectedTextBox.style.left = val + 'px';
  });

  posYInput?.addEventListener('input', e => {
    if (!selectedTextBox) return;
    let val = parseInt(e.target.value);
    if (isNaN(val)) val = 0;
    selectedTextBox.style.top = val + 'px';
  });

  fontSizeInput?.addEventListener('input', e => {
    if (!selectedTextBox) return;
    let val = parseInt(e.target.value);
    if (!isNaN(val)) selectedTextBox.style.fontSize = val + 'px';
  });

  textColorInput?.addEventListener('input', e => {
    if (!selectedTextBox) return;
    selectedTextBox.style.color = e.target.value;
  });

  bgColorInput?.addEventListener('input', e => {
    if (!selectedTextBox) return;
    if (!bgTransparentInput.checked) {
      selectedTextBox.style.backgroundColor = e.target.value;
    }
  });

  bgTransparentInput?.addEventListener('change', e => {
    if (!selectedTextBox) return;
    if (e.target.checked) {
      selectedTextBox.style.backgroundColor = 'transparent';
      if (bgColorInput) bgColorInput.disabled = true;
    } else {
      selectedTextBox.style.backgroundColor = bgColorInput.value;
      if (bgColorInput) bgColorInput.disabled = false;
    }
  });

  textBoldInput?.addEventListener('change', e => {
    if (!selectedTextBox) return;
    selectedTextBox.style.fontWeight = e.target.checked ? 'bold' : 'normal';
  });
}
