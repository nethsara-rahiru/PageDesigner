const headingUpload = document.getElementById('headingUpload');
const questionUpload = document.getElementById('questionUpload');
const paperContainer = document.getElementById('paperContainer');

let pageCount = 0;

function createNewPage() {
  pageCount++;
  const page = document.createElement('div');
  page.className = 'page';

  const content = document.createElement('div');
  content.className = 'page-content';

  const footer = document.createElement('div');
  footer.className = 'page-footer';

  const footerImg = new Image();
  footerImg.src = 'Footer.png'; // Use your GitHub path if in subfolder
  footerImg.style.maxHeight = '25px';
  footerImg.style.objectFit = 'contain';
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

// Load Header.png from GitHub root folder when page loads
window.addEventListener('DOMContentLoaded', () => {
  const staticHeader = new Image();
  staticHeader.src = 'Header.png'; // Use raw URL if in subfolder
  staticHeader.onload = () => {
    addImageToPaper(staticHeader.src, true);
  };
});

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
