const headingUpload = document.getElementById('headingUpload');
const questionUpload = document.getElementById('questionUpload');
const paperContainer = document.getElementById('paperContainer');

let pageCount = 0;
const maxHeight = 297 - 40; // page height in mm - 2×20mm padding

// Create a new page
function createNewPage() {
  pageCount++;
  const page = document.createElement('div');
  page.className = 'page';

  const content = document.createElement('div');
  content.className = 'page-content';

  const footer = document.createElement('div');
  footer.className = 'page-footer';
  footer.innerText = `Page ${pageCount} - Prepared by Sir Nethsara`;

  page.appendChild(content);
  page.appendChild(footer);
  paperContainer.appendChild(page);
  return content;
}

let currentContent = createNewPage();

function addImageToPaper(file) {
  const img = document.createElement('img');
  img.src = URL.createObjectURL(file);
  img.style.maxWidth = '100%';
  img.style.height = 'auto';

  img.onload = () => {
    currentContent.appendChild(img);

    const page = currentContent.parentElement;
    if (page.scrollHeight > page.clientHeight) {
      // Move image to new page if overflows
      currentContent.removeChild(img);
      currentContent = createNewPage();
      currentContent.appendChild(img);
    }
  };
}

headingUpload.addEventListener('change', function () {
  const file = this.files[0];
  if (file) addImageToPaper(file);
});

questionUpload.addEventListener('change', function () {
  Array.from(this.files).forEach(file => {
    addImageToPaper(file);
  });
});
