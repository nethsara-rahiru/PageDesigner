const headingUpload = document.getElementById('headingUpload');
const questionUpload = document.getElementById('questionUpload');
const paperContainer = document.getElementById('paperContainer');

let pageCount = 0;

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

let currentContent = createNewPage();

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

  // Load default header image on first page
  const staticHeader = new Image();
  staticHeader.src = 'Header.png';
  staticHeader.onload = () => {
    addImageToPaper(staticHeader.src, true);
  };
});

let textModeActive = false;
let selectedTextBox = null;

function activateTextMode() {
  textModeActive = true;
  showHint("Click on a page to place your text.");
}

function showHint(message) {
  const hint = document.createElement('div');
  hint.className = 'hint-box';
  hint.innerText = message;
  document.body.appendChild(hint);
  setTimeout(() => hint.remove(), 3000);
}

document.addEventListener('click', function (e) {
  if (!textModeActive) return;

  // Ignore clicks inside toolbar, textTools, or existing text boxes
  if (
    e.target.closest('.toolbar') || 
    e.target.closest('#textTools') || 
    e.target.closest('.text-box')
  ) return;

  const clickedPage = e.target.closest('.page');
  if (!clickedPage) return;

  const textBox = document.createElement('div');
  textBox.className = 'text-box';
  textBox.contentEditable = true;
  textBox.innerText = 'Type here...';

  const rect = clickedPage.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  textBox.style.left = `${x}px`;
  textBox.style.top = `${y}px`;

  clickedPage.appendChild(textBox);

  textBox.focus();

  makeTextBoxDraggable(textBox);
  setupTextSettings(textBox);
  showTextSettings();

  selectedTextBox = textBox;
  textModeActive = false;

  // Also add click listener so selecting a box updates the toolbar
  textBox.addEventListener('click', (ev) => {
    ev.stopPropagation(); // prevent triggering page click
    selectedTextBox = textBox;
    setupTextSettings(textBox);
    showTextSettings();
  });
});

function makeTextBoxDraggable(textBox) {
  let isDragging = false;
  let offsetX, offsetY;

  textBox.addEventListener('mousedown', (e) => {
    const rect = textBox.getBoundingClientRect();
    const resizeZone = 16;

    // Allow native resize if cursor is in resize corner area
    if (
      e.clientX > rect.right - resizeZone &&
      e.clientY > rect.bottom - resizeZone
    ) {
      return; // skip drag, allow native resize
    }

    isDragging = true;
    offsetX = e.clientX - textBox.offsetLeft;
    offsetY = e.clientY - textBox.offsetTop;

    // Prevent text selection while dragging
    e.preventDefault();
  });

  const parent = textBox.parentElement;

  function onMouseMove(e) {
    if (!isDragging) return;

    const newX = e.clientX - offsetX;
    const newY = e.clientY - offsetY;

    const maxX = parent.clientWidth - textBox.offsetWidth;
    const maxY = parent.clientHeight - textBox.offsetHeight;

    textBox.style.left = `${Math.min(Math.max(0, newX), maxX)}px`;
    textBox.style.top = `${Math.min(Math.max(0, newY), maxY)}px`;

    updateSettingsInputs(textBox);
  }

  function onMouseUp() {
    isDragging = false;
  }

  textBox.addEventListener('mouseup', onMouseUp);
  parent.addEventListener('mousemove', onMouseMove);
}

function setupTextSettings(textBox) {
  const xInput = document.getElementById('textPosX');
  const yInput = document.getElementById('textPosY');
  const fontSizeInput = document.getElementById('textFontSize');
  const colorInput = document.getElementById('textColor');
  const bgColorPicker = document.getElementById('bgColorPicker');
  const bgTransparent = document.getElementById('bgTransparent');
  const boldCheckbox = document.getElementById('textBold');
  const deleteBtn = document.querySelector('button[onclick="deleteSelectedText()"]') || document.getElementById('deleteText');

  // Defensive: if button missing, fallback
  if (!deleteBtn) {
    console.warn('Delete button not found');
  }

  function updateInputs() {
    xInput.value = parseInt(textBox.style.left) || 0;
    yInput.value = parseInt(textBox.style.top) || 0;
    fontSizeInput.value = parseInt(window.getComputedStyle(textBox).fontSize) || 14;
    colorInput.value = rgbToHex(window.getComputedStyle(textBox).color) || '#000000';

    const bgColor = window.getComputedStyle(textBox).backgroundColor;
    if (bgColor === 'rgba(0, 0, 0, 0)') {
      bgTransparent.checked = true;
      bgColorPicker.value = '#ffffff';
    } else {
      bgTransparent.checked = false;
      bgColorPicker.value = rgbToHex(bgColor);
    }
    const weight = window.getComputedStyle(textBox).fontWeight;
    boldCheckbox.checked = (weight === '700' || weight === 'bold');
  }

  updateInputs();

  xInput.oninput = () => {
    textBox.style.left = xInput.value + 'px';
  };
  yInput.oninput = () => {
    textBox.style.top = yInput.value + 'px';
  };
  fontSizeInput.oninput = () => {
    textBox.style.fontSize = fontSizeInput.value + 'px';
  };
  colorInput.oninput = () => {
    textBox.style.color = colorInput.value;
  };
  bgColorPicker.oninput = () => {
    if (!bgTransparent.checked) {
      textBox.style.backgroundColor = bgColorPicker.value;
    }
  };
  bgTransparent.onchange = () => {
    if (bgTransparent.checked) {
      textBox.style.backgroundColor = 'transparent';
    } else {
      textBox.style.backgroundColor = bgColorPicker.value;
    }
  };
  boldCheckbox.onchange = () => {
    textBox.style.fontWeight = boldCheckbox.checked ? 'bold' : 'normal';
  };
  deleteBtn.onclick = () => {
    if (selectedTextBox) {
      selectedTextBox.remove();
      selectedTextBox = null;
      closeTextTools();
    }
  };
}

function updateSettingsInputs(textBox) {
  if (!selectedTextBox) return;
  const xInput = document.getElementById('textPosX');
  const yInput = document.getElementById('textPosY');
  xInput.value = parseInt(selectedTextBox.style.left) || 0;
  yInput.value = parseInt(selectedTextBox.style.top) || 0;
}

function showTextSettings() {
  document.getElementById('mainTools').style.display = 'none';
  document.getElementById('textTools').style.display = 'block';
}

function closeTextTools() {
  document.getElementById('mainTools').style.display = 'block';
  document.getElementById('textTools').style.display = 'none';
  selectedTextBox = null;
}

function rgbToHex(rgb) {
  if (!rgb) return '#ffffff';
  const result = rgb.match(/\d+/g);
  if (!result) return '#ffffff';
  return (
    '#' +
    result
      .slice(0, 3)
      .map(x => ('0' + parseInt(x).toString(16)).slice(-2))
      .join('')
  );
}

// Optional: function to delete selected text box, called from button in HTML
function deleteSelectedText() {
  if (selectedTextBox) {
    selectedTextBox.remove();
    selectedTextBox = null;
    closeTextTools();
  }
}
