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
  footerImg.style.height = 'auto';
  footerImg.style.display = 'block';
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
  img.style.maxWidth = '100%';
  img.style.height = 'auto';

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

function updatePageScale() {
  const pageHeightPx = 1122.5; // 297mm in px at 96dpi
  const availableHeight = window.innerHeight - 20; // some padding
  const scale = availableHeight / pageHeightPx;
  // Keep scale max 1 (don’t upscale)
  document.documentElement.style.setProperty('--page-scale', scale > 1 ? 1 : scale);
}

window.addEventListener('resize', updatePageScale);
window.addEventListener('DOMContentLoaded', () => {
  applyMargins();
  updatePageScale();

  const staticHeader = new Image();
  staticHeader.src = 'Header.png';
  staticHeader.onload = () => {
    addImageToPaper(staticHeader.src, true);
  };
});
