/* Nethsara Rahiru */

// --- State & Constants ---
let pageCount = 0;
let selectedElement = null;
let textModeActive = false;
let figureModeActive = false;
let currentFigureAction = 'select'; // Default shape
let gridSnapEnabled = false;
let currentZoom = 100;

const paperContainer = document.getElementById('paperContainer');
const statusToast = document.getElementById('statusToast');
const statusText = document.getElementById('statusText');
const statusIcon = document.getElementById('statusIcon');

// PDF.js worker configuration
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

let currentPdfDoc = null;
let selectedPdfPages = new Set();

// --- Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    initializeWorkspace();
    setupGlobalListeners();
    setupToolbarListeners();
    showToast('PageDesigner Pro Ready', '🚀');
});

function initializeWorkspace() {
    createNewPage();
    applyMargins();
    setFigureAction('select'); // Start with select tool

    // Initialize zoom
    const zoomRange = document.getElementById('zoomRange');
    zoomRange?.addEventListener('input', (e) => {
        currentZoom = e.target.value;
        const pages = document.querySelectorAll('.page');
        pages.forEach(p => p.style.transform = `scale(${currentZoom / 100})`);
    });
}

// --- Page & Content Management ---
function createNewPage() {
    pageCount++;
    const page = document.createElement('div');
    page.className = 'page';
    page.dataset.pageNumber = pageCount;

    const content = document.createElement('div');
    content.className = 'page-content';

    // Add Header to first page
    if (pageCount === 1) {
        const header = document.createElement('header');
        header.className = 'page-header';
        const img = new Image();
        img.src = 'Header.png';
        img.onerror = () => header.innerHTML = '<div style="height:40px; border-bottom:1px solid #ddd; margin-bottom:20px; display:flex; align-items:center;">[HEADER MISSING]</div>';
        header.appendChild(img);
        content.appendChild(header);
    }

    // Common Footer
    const footer = document.createElement('footer');
    footer.className = 'page-footer';
    const footerImg = new Image();
    footerImg.src = 'Footer.png';
    footerImg.onerror = () => footer.style.display = 'none';
    footer.appendChild(footerImg);

    page.appendChild(content);
    page.appendChild(footer);
    paperContainer.appendChild(page);

    // Title
    if (pageCount === 1) {
        addTitleBox(content);
    }

    return content;
}

function addTitleBox(parent) {
    const box = createTextBox(41, 170, true);
    box.innerText = 'Practice Paper 01';
    box.classList.add('title-box');
    box.style.width = '712px';
    box.style.height = '33px';
    box.style.backgroundColor = 'white';
    box.style.fontWeight = 'bold';
    box.style.fontSize = '18px';
    box.style.fontFamily = 'sans-serif'
    box.style.textAlign = 'center';
    box.style.border = 'none';
    parent.appendChild(box);
}

function applyMargins() {
    const top = document.getElementById('marginTop').value + 'mm';
    const bottom = document.getElementById('marginBottom').value + 'mm';
    const left = document.getElementById('marginLeft').value + 'mm';
    const right = document.getElementById('marginRight').value + 'mm';

    const pages = document.querySelectorAll('.page-content');
    pages.forEach(content => {
        content.style.padding = `${top} ${right} ${bottom} ${left}`;
    });
    showToast('Layout settings applied', '📐');
}

// --- Image Handling ---
function addImageToPaper(source, isBase64 = false) {
    return new Promise((resolve) => {
        const img = document.createElement('img');
        img.src = isBase64 ? source : URL.createObjectURL(source);
        img.className = 'inserted-image';
        img.style.cursor = 'pointer';

        img.onload = () => {
            img.style.width = '100%'; // Maximize to fill space
            img.style.height = 'auto';
            img.style.display = 'block';
            const defaultGap = '1rem';
            img.style.marginTop = defaultGap;
            img.dataset.gap = defaultGap;

            let currentPage = paperContainer.lastElementChild.querySelector('.page-content');
            currentPage.appendChild(img);

            // Check overflow
            const page = currentPage.parentElement;
            if (page.scrollHeight > page.clientHeight) {
                currentPage.removeChild(img);
                currentPage = createNewPage();
                currentPage.appendChild(img);
            }

            // Add click listener for deletion
            img.onclick = (e) => {
                if (isSplitting) return;
                e.stopPropagation();
                selectElement(img);
            };

            // --- Reordering Logic ---
            img.draggable = true;
            img.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', flowAssetsOrder.indexOf(img));
                img.classList.add('dragging');
            });
            img.addEventListener('dragend', () => img.classList.remove('dragging'));

            img.addEventListener('dragover', (e) => {
                e.preventDefault();
                const rect = img.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                img.style.borderTop = e.clientY < mid ? '4px solid var(--primary)' : '';
                img.style.borderBottom = e.clientY >= mid ? '4px solid var(--primary)' : '';
            });

            img.addEventListener('dragleave', () => {
                img.style.borderTop = '';
                img.style.borderBottom = '';
            });

            img.addEventListener('drop', (e) => {
                e.preventDefault();
                img.style.borderTop = '';
                img.style.borderBottom = '';
                const draggedIdx = parseInt(e.dataTransfer.getData('text/plain'));
                const draggedEl = flowAssetsOrder[draggedIdx];
                if (!draggedEl || draggedEl === img) return;

                const rect = img.getBoundingClientRect();
                const isAfter = e.clientY > rect.top + rect.height / 2;

                // Move in order array
                flowAssetsOrder.splice(draggedIdx, 1);
                let newIdx = flowAssetsOrder.indexOf(img);
                if (isAfter) newIdx++;
                flowAssetsOrder.splice(newIdx, 0, draggedEl);

                revalidateAssetPosition();
            });

            if (!flowAssetsOrder.includes(img)) flowAssetsOrder.push(img);
            resolve(img);
        };

        img.onerror = () => {
            console.error("Failed to load inserted image");
            showToast("Asset failed to load", "⚠️");
            resolve(null); // Resolve with null so caller can continue
        };
    });
}
function addManualQuestion() {
    const q = document.createElement('div');
    q.className = 'manual-question inserted-image'; // Hooks into reflow engine
    q.contentEditable = true;
    q.innerText = 'Type your question here...';

    const defaultGap = '1rem';
    q.style.marginTop = defaultGap;
    q.dataset.gap = defaultGap;
    q.style.width = '100%';
    q.style.display = 'block';

    q.onclick = (e) => {
        e.stopPropagation();
        selectElement(q);
    };

    q.oninput = () => {
        triggerReflow();
    };

    // --- Reordering Logic ---
    q.draggable = true;
    q.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', flowAssetsOrder.indexOf(q));
        q.classList.add('dragging');
    });
    q.addEventListener('dragend', () => q.classList.remove('dragging'));

    q.addEventListener('dragover', (e) => {
        e.preventDefault();
        const rect = q.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        q.style.borderTop = e.clientY < mid ? '4px solid var(--primary)' : '';
        q.style.borderBottom = e.clientY >= mid ? '4px solid var(--primary)' : '';
    });

    q.addEventListener('dragleave', () => {
        q.style.borderTop = '';
        q.style.borderBottom = '';
    });

    q.addEventListener('drop', (e) => {
        e.preventDefault();
        q.style.borderTop = '';
        q.style.borderBottom = '';
        const draggedIdx = parseInt(e.dataTransfer.getData('text/plain'));
        const draggedEl = flowAssetsOrder[draggedIdx];
        if (!draggedEl || draggedEl === q) return;

        const rect = q.getBoundingClientRect();
        const isAfter = e.clientY > rect.top + rect.height / 2;

        flowAssetsOrder.splice(draggedIdx, 1);
        let newIdx = flowAssetsOrder.indexOf(q);
        if (isAfter) newIdx++;
        flowAssetsOrder.splice(newIdx, 0, draggedEl);

        revalidateAssetPosition();
    });

    let currentPage = paperContainer.lastElementChild.querySelector('.page-content');
    let insertIndex = -1;

    if (selectedElement && flowAssetsOrder.includes(selectedElement)) {
        insertIndex = flowAssetsOrder.indexOf(selectedElement) + 1;
        currentPage = selectedElement.closest('.page-content') || currentPage;
    }

    currentPage.appendChild(q);

    if (!flowAssetsOrder.includes(q)) {
        if (insertIndex !== -1) {
            flowAssetsOrder.splice(insertIndex, 0, q);
        } else {
            flowAssetsOrder.push(q);
        }
    }

    revalidateAssetPosition();

    setTimeout(() => {
        selectElement(q);
        q.focus();
        q.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// Global drawing sequence state (cleared on box/tool change)
let figureClickStack = [];
let drawingInBox = null;

// --- Geometry / Figure Mode logic ---
function activateFigureMode() {
    figureModeActive = true;
    document.body.style.cursor = 'crosshair';
    const btn = document.querySelector('button[onclick="activateFigureMode()"]');
    if (btn) {
        btn.innerText = '🎯 Click to place drawing...';
        btn.classList.add('secondary');
    }
    showToast('Click anywhere on the pages to place a drawing area', '📐');
}

function toggleGridSnap(enabled) {
    gridSnapEnabled = enabled;
    document.querySelectorAll('.figure-box').forEach(box => {
        box.classList.toggle('show-grid', enabled);
    });
}

function snapCoord(val) {
    if (!gridSnapEnabled) return val;
    return Math.round(val / 5) * 5;
}

function clearFigureCanvas() {
    if (!selectedElement || !selectedElement.classList.contains('figure-box')) return;
    const svg = selectedElement.querySelector('svg');
    const preview = svg.querySelector('.geo-preview');
    svg.innerHTML = '';
    if (preview) svg.appendChild(preview);
    figureClickStack = []; // Reset stack on clear
    showToast('Canvas cleared', '✨');
}

function setFigureAction(action) {
    currentFigureAction = action;
    figureClickStack = [];
    drawingInBox = null;

    // Clear all previews and temporary markers
    document.querySelectorAll('.figure-box svg .geo-preview').forEach(p => p.setAttribute('d', ''));
    document.querySelectorAll('.temp-point').forEach(p => p.remove());

    // Active UI feedback
    document.querySelectorAll('.geo-tool').forEach(b => {
        const onclick = b.getAttribute('onclick') || '';
        const isMatch = onclick.includes(`'${action}'`);
        b.classList.toggle('primary', isMatch);
        b.classList.toggle('secondary', !isMatch);
    });

    // Cursor feedback
    document.body.style.cursor = action === 'select' ? 'default' : 'crosshair';

    showToast(`Geometry Tool: ${action.toUpperCase()}`, '📏');
}

function createFigureBox(x, y) {
    const box = document.createElement('div');
    box.className = 'figure-box' + (gridSnapEnabled ? ' show-grid' : '');
    box.style.left = `${x}px`;
    box.style.top = `${y}px`;
    box.style.width = '200px';
    box.style.height = '200px';

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '200');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('preserveAspectRatio', 'none');

    // Preview Layer
    const preview = document.createElementNS("http://www.w3.org/2000/svg", "path");
    preview.setAttribute('class', 'geo-preview');
    svg.appendChild(preview);

    box.appendChild(svg);

    box.addEventListener('mousedown', (e) => {
        if (figureModeActive || e.target.classList.contains('math-label')) return;
        startDrag(e);
    });

    box.addEventListener('mousemove', (e) => {
        if (figureClickStack.length === 0) return;
        const rect = box.getBoundingClientRect();
        const scale = currentZoom / 100;
        const mx = snapCoord((e.clientX - rect.left) / scale);
        const my = snapCoord((e.clientY - rect.top) / scale);
        updateGeoPreview(preview, figureClickStack, { x: mx, y: my });
    });

    box.addEventListener('click', (e) => {
        e.stopPropagation();
        selectElement(box);
        if (figureModeActive || currentFigureAction === 'select') return;
        handleFigureCanvasClick(e, box, svg);
    });

    box.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        figureClickStack = [];
        drawingInBox = null;
        preview.setAttribute('d', '');
        svg.querySelectorAll('.temp-point').forEach(p => p.remove());
        showToast('Drawing Cancelled', '🚫');
    });

    return box;
}

function updateGeoPreview(preview, stack, mouse) {
    if (currentFigureAction === 'select' || stack.length === 0) return;
    const p1 = stack[0];
    let d = '';
    switch (currentFigureAction) {
        case 'line':
            d = `M ${p1.x} ${p1.y} L ${mouse.x} ${mouse.y}`;
            break;
        case 'rect':
            const x = Math.min(p1.x, mouse.x);
            const y = Math.min(p1.y, mouse.y);
            const w = Math.abs(p1.x - mouse.x);
            const h = Math.abs(p1.y - mouse.y);
            d = `M ${x} ${y} h ${w} v ${h} h ${-w} z`;
            break;
        case 'circle':
            const r = Math.sqrt(Math.pow(mouse.x - p1.x, 2) + Math.pow(mouse.y - p1.y, 2));
            d = `M ${p1.x} ${p1.y - r} a ${r} ${r} 0 1 1 0 ${2 * r} a ${r} ${r} 0 1 1 0 ${-2 * r}`;
            break;
        case 'triangle':
            if (stack.length === 1) {
                d = `M ${stack[0].x} ${stack[0].y} L ${mouse.x} ${mouse.y}`;
            } else if (stack.length === 2) {
                d = `M ${stack[0].x} ${stack[0].y} L ${stack[1].x} ${stack[1].y} L ${mouse.x} ${mouse.y} Z`;
            }
            break;
    }
    preview.setAttribute('d', d);
}

function handleFigureCanvasClick(e, box, svg) {
    if (e.target.classList.contains('math-label')) return;

    // Safety: Reset stack if user switches to a different drawing box mid-way
    if (drawingInBox && drawingInBox !== box) {
        figureClickStack = [];
        document.querySelectorAll('.temp-point').forEach(p => p.remove());
    }
    drawingInBox = box;

    const rect = box.getBoundingClientRect();
    const scale = currentZoom / 100;
    const x = snapCoord((e.clientX - rect.left) / scale);
    const y = snapCoord((e.clientY - rect.top) / scale);
    const preview = svg.querySelector('.geo-preview');

    figureClickStack.push({ x, y });
    drawGeoPoint(svg, x, y); // Visual feedback for the click

    // Handle Actions
    const finishShape = () => {
        figureClickStack = [];
        drawingInBox = null;
        preview.setAttribute('d', '');
        svg.querySelectorAll('.temp-point').forEach(p => p.remove());
    };

    switch (currentFigureAction) {
        case 'line':
            if (figureClickStack.length === 2) {
                drawGeoLine(svg, figureClickStack[0], figureClickStack[1]);
                finishShape();
            }
            break;
        case 'rect':
            if (figureClickStack.length === 2) {
                drawGeoRect(svg, figureClickStack[0], figureClickStack[1]);
                finishShape();
            }
            break;
        case 'circle':
            if (figureClickStack.length === 2) {
                const center = figureClickStack[0];
                const r = Math.sqrt(Math.pow(x - center.x, 2) + Math.pow(y - center.y, 2));
                drawGeoCircle(svg, center, r);
                finishShape();
            }
            break;
        case 'triangle':
            if (figureClickStack.length === 3) {
                drawGeoTriangle(svg, figureClickStack);
                finishShape();
            }
            break;
        case 'label':
            addGeoLabel(svg, x, y);
            finishShape();
            break;
    }
}

function drawGeoPoint(svg, x, y) {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", 4);
    dot.setAttribute("class", "temp-point");
    dot.style.fill = "var(--primary)";
    dot.style.pointerEvents = "none";
    svg.appendChild(dot);
}

// --- PDF Logic ---
async function handlePdfUpload(file) {
    if (!file) return;
    showToast('Loading PDF...', '⏳');

    try {
        const arrayBuffer = await file.arrayBuffer();
        currentPdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        openPdfModal();
        renderPdfThumbnails();
    } catch (error) {
        console.error('PDF Error:', error);
        showToast('Error loading PDF', '❌');
    }
}

function openPdfModal() {
    document.getElementById('pdfModal').classList.remove('hidden');
    selectedPdfPages.clear();
    updatePdfInsertBtn();
}

function closePdfModal() {
    document.getElementById('pdfModal').classList.add('hidden');
    document.getElementById('pdfPreviewGrid').innerHTML = '<div class="loading-state"><span>⏳ Preparing PDF previews...</span></div>';
}

async function renderPdfThumbnails() {
    const grid = document.getElementById('pdfPreviewGrid');
    grid.innerHTML = '';

    for (let i = 1; i <= currentPdfDoc.numPages; i++) {
        const page = await currentPdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });

        const card = document.createElement('div');
        card.className = 'pdf-page-card';
        card.innerHTML = `
            <span class="page-badge">Page ${i}</span>
            <div class="selection-marker">✓</div>
        `;

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        await page.render({ canvasContext: context, viewport }).promise;
        card.prepend(canvas);

        card.onclick = () => togglePdfPageSelection(i, card);
        grid.appendChild(card);
    }
}

function togglePdfPageSelection(pageNum, card) {
    if (selectedPdfPages.has(pageNum)) {
        selectedPdfPages.delete(pageNum);
        card.classList.remove('selected');
    } else {
        selectedPdfPages.add(pageNum);
        card.classList.add('selected');
    }
    updatePdfInsertBtn();
}

function updatePdfInsertBtn() {
    const btn = document.getElementById('insertPdfBtn');
    const count = selectedPdfPages.size;
    btn.innerText = `Insert ${count} Selected Pages`;
    btn.disabled = count === 0;
}

async function insertSelectedPdfPages() {
    const sortedPages = Array.from(selectedPdfPages).sort((a, b) => a - b);
    showToast(`Inserting ${sortedPages.length} PDF pages...`, '⏳');

    closePdfModal();

    for (const pageNum of sortedPages) {
        try {
            const page = await currentPdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 4.0 }); // Increased scale for high-quality rendering

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d');

            await page.render({ canvasContext: context, viewport }).promise;

            // Sequential await for insertion
            await new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    addImageToPaper(blob).then(resolve);
                }, 'image/png');
            });

            showToast(`Inserted page ${pageNum}`, '✅');
        } catch (err) {
            console.error('PDF Insertion Error:', err);
        }
    }

    currentPdfDoc = null;
    showToast(`PDF Import Complete`, '📚');
}

function drawGeoLine(svg, p1, p2) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", p1.x);
    line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x);
    line.setAttribute("y2", p2.y);
    line.setAttribute("stroke", "black");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("class", "geo-shape");
    svg.appendChild(line);
}

function drawGeoRect(svg, p1, p2) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const w = Math.abs(p1.x - p2.x);
    const h = Math.abs(p1.y - p2.y);
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.setAttribute("stroke", "black");
    rect.setAttribute("stroke-width", "2");
    rect.setAttribute("fill", "none");
    rect.setAttribute("class", "geo-shape");
    svg.appendChild(rect);
}

function drawGeoCircle(svg, center, r) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", center.x);
    circle.setAttribute("cy", center.y);
    circle.setAttribute("r", r);
    circle.setAttribute("stroke", "black");
    circle.setAttribute("stroke-width", "2");
    circle.setAttribute("fill", "none");
    circle.setAttribute("class", "geo-shape");
    svg.appendChild(circle);
}

function drawGeoTriangle(svg, pts) {
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    const pointsStr = pts.map(p => `${p.x},${p.y}`).join(" ");
    poly.setAttribute("points", pointsStr);
    poly.setAttribute("stroke", "black");
    poly.setAttribute("stroke-width", "2");
    poly.setAttribute("fill", "none");
    poly.setAttribute("class", "geo-shape");
    svg.appendChild(poly);
}

function addGeoLabel(svg, x, y) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const val = prompt("Enter measurement (e.g. 5 cm, 90°):", "5 cm");
    if (!val) return;
    text.setAttribute("x", x);
    text.setAttribute("y", y);
    text.setAttribute("class", "math-label");
    text.textContent = val;
    svg.appendChild(text);
}

function add3DAsset(type) {
    if (!selectedElement || !selectedElement.classList.contains('figure-box')) {
        showToast('Select a Figure Area first', '📍');
        return;
    }
    const svg = selectedElement.querySelector('svg');
    if (type === 'cube') {
        const x = 50, y = 70, s = 80, d = 30; // Centered for 200x200
        // Back
        drawGeoRect(svg, { x: x + d, y: y - d }, { x: x + d + s, y: y - d + s });
        // Connectors
        drawGeoLine(svg, { x, y }, { x: x + d, y: y - d });
        drawGeoLine(svg, { x: x + s, y }, { x: x + s + d, y: y - d });
        drawGeoLine(svg, { x, y: y + s }, { x: x + d, y: y - d + s });
        drawGeoLine(svg, { x: x + s, y: y + s }, { x: x + s + d, y: y - d + s });
        // Front
        drawGeoRect(svg, { x, y }, { x: x + s, y: y + s });
    } else if (type === 'cylinder') {
        const x = 100, y = 50, w = 100, h = 100; // Centered
        // Sides
        drawGeoLine(svg, { x: x - w / 2, y }, { x: x - w / 2, y: y + h });
        drawGeoLine(svg, { x: x + w / 2, y }, { x: x + w / 2, y: y + h });
        // Top ellipse
        const top = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        top.setAttribute("cx", x); top.setAttribute("cy", y);
        top.setAttribute("rx", w / 2); top.setAttribute("ry", 20);
        top.setAttribute("class", "geo-shape");
        svg.appendChild(top);
        // Bottom ellipse
        const btm = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        btm.setAttribute("cx", x); btm.setAttribute("cy", y + h);
        btm.setAttribute("rx", w / 2); btm.setAttribute("ry", 20);
        btm.setAttribute("class", "geo-shape");
        svg.appendChild(btm);
    }
}

function toggleMeasures(show) {
    const labels = document.querySelectorAll('.math-label');
    labels.forEach(l => l.style.display = show ? 'block' : 'none');
}

function showFigureTools() {
    document.getElementById('mainTools').classList.add('hidden');
    document.getElementById('textTools').classList.add('hidden');
    document.getElementById('imageTools').classList.add('hidden');
    document.getElementById('figureTools').classList.remove('hidden');
}

// --- Text Mode logic ---
function activateTextMode() {
    textModeActive = true;
    document.body.style.cursor = 'crosshair';
    const btn = document.getElementById('addTextBtn');
    btn.innerText = '🎯 Click to place text...';
    btn.classList.add('secondary');
    showToast('Click anywhere on the pages to place text', '📌');
}

function createTextBox(x, y, manual = false) {
    const box = document.createElement('div');
    box.className = 'text-box';
    box.contentEditable = true;
    if (!manual) box.innerText = 'New Text Block';

    box.style.left = typeof x === 'string' ? x : `${x}px`;
    box.style.top = typeof y === 'string' ? y : `${y}px`;

    box.addEventListener('mousedown', startDrag);
    box.addEventListener('click', (e) => {
        e.stopPropagation();
        selectElement(box);
    });

    return box;
}

// --- Draggable Logic ---
let isDragging = false;
let dragX, dragY;

function startDrag(e) {
    if (e.target.contentEditable === "true" && e.target === document.activeElement) return;

    isDragging = true;
    selectedElement = e.target;
    const rect = selectedElement.getBoundingClientRect();
    const scale = currentZoom / 100;

    dragX = (e.clientX / scale) - selectedElement.offsetLeft;
    dragY = (e.clientY / scale) - selectedElement.offsetTop;

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);

    selectElement(selectedElement);
    e.preventDefault();
}

function onDrag(e) {
    if (!isDragging || !selectedElement) return;

    const scale = currentZoom / 100;
    const x = (e.clientX / scale) - dragX;
    const y = (e.clientY / scale) - dragY;

    selectedElement.style.left = `${x}px`;
    selectedElement.style.top = `${y}px`;

    updateToolbarInputs();
}

function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
}

function resetZoom() {
    currentZoom = 100;
    const zoomRange = document.getElementById('zoomRange');
    if (zoomRange) zoomRange.value = 100;
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.style.transform = `scale(1)`);
    showToast('Zoom Reset', '🔍');
}

// --- Selection & Toolbars ---
let cropper = null;

function selectElement(el) {
    if (selectedElement) selectedElement.classList.remove('selected');

    selectedElement = el;
    selectedElement.classList.add('selected');

    if (el.classList.contains('text-box')) {
        showTextTools();
        updateToolbarInputs();
    } else if (el.classList.contains('figure-box')) {
        showFigureTools();
    } else if (el.tagName === 'IMG' || el.classList.contains('inserted-image')) {
        showImageTools();
        updateImageToolbar();
        // Hide specific image-only tools if it's text
        const isText = el.classList.contains('manual-question');
        document.getElementById('imgWidthRange').parentElement.style.display = isText ? 'none' : 'flex';
        document.querySelector('button[onclick="startCropping()"]').style.display = isText ? 'none' : 'block';
        document.querySelector('button[onclick="prepareSplit()"]').style.display = isText ? 'none' : 'block';
    } else {
        closeAllTools();
    }
}

function showTextTools() {
    document.getElementById('mainTools').classList.add('hidden');
    document.getElementById('imageTools').classList.add('hidden');
    document.getElementById('figureTools').classList.add('hidden');
    document.getElementById('textTools').classList.remove('hidden');
}

function showImageTools() {
    document.getElementById('mainTools').classList.add('hidden');
    document.getElementById('textTools').classList.add('hidden');
    document.getElementById('figureTools').classList.add('hidden');
    document.getElementById('imageTools').classList.remove('hidden');
}

function closeTextTools() {
    closeAllTools();
}

function closeImageTools() {
    closeAllTools();
}

function closeAllTools() {
    document.getElementById('textTools').classList.add('hidden');
    document.getElementById('imageTools').classList.add('hidden');
    document.getElementById('figureTools').classList.add('hidden');
    document.getElementById('mainTools').classList.remove('hidden');

    // Cleanup temporary states
    figureClickStack = [];
    document.querySelectorAll('.figure-box svg .geo-preview').forEach(p => p.setAttribute('d', ''));

    if (selectedElement) {
        selectedElement.classList.remove('selected');
        selectedElement = null;
    }
}

function updateImageToolbar() {
    if (!selectedElement || (selectedElement.tagName !== 'IMG' && !selectedElement.classList.contains('inserted-image'))) return;
    const currentWidth = parseInt(selectedElement.style.width) || 100;
    document.getElementById('imgWidthRange').value = currentWidth;

    const currentGap = parseInt(selectedElement.style.marginTop) || 0;
    document.getElementById('imgGapRange').value = currentGap;
}

function updateToolbarInputs() {
    if (!selectedElement || !selectedElement.classList.contains('text-box')) return;

    const style = window.getComputedStyle(selectedElement);

    document.getElementById('textPosX').value = parseInt(selectedElement.style.left) || 0;
    document.getElementById('textPosY').value = parseInt(selectedElement.style.top) || 0;
    document.getElementById('textWidth').value = parseInt(style.width) || selectedElement.offsetWidth;
    document.getElementById('textHeight').value = parseInt(style.height) || selectedElement.offsetHeight;

    document.getElementById('textFontSize').value = parseInt(style.fontSize);
    document.getElementById('textColor').value = rgbToHex(style.color);
    document.getElementById('textBold').checked = (style.fontWeight === '700' || style.fontWeight === 'bold');
    document.getElementById('textPadding').value = parseInt(style.padding) || 0;

    document.getElementById('borderColorPicker').value = rgbToHex(style.borderColor) || '#cccccc';
    document.getElementById('borderWidth').value = parseInt(style.borderWidth) || 0;

    const bgColor = style.backgroundColor;
    if (bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
        document.getElementById('bgTransparent').checked = true;
        document.getElementById('bgColorPicker').setAttribute('disabled', 'true');
    } else {
        document.getElementById('bgTransparent').checked = false;
        document.getElementById('bgColorPicker').removeAttribute('disabled');
        document.getElementById('bgColorPicker').value = rgbToHex(bgColor);
    }
}

// --- Cropping Logic ---
function getAutoCropRect(imageObj) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const w = imageObj.naturalWidth || imageObj.width;
    const h = imageObj.naturalHeight || imageObj.height;
    if (w === 0 || h === 0) return { left: 0, top: 0, width: w, height: h };

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(imageObj, 0, 0, w, h);

    let imageData;
    try {
        imageData = ctx.getImageData(0, 0, w, h);
    } catch (e) {
        return { left: 0, top: 0, width: w, height: h }; // CORS issue fallback
    }

    const data = imageData.data;
    let minX = w, minY = h, maxX = 0, maxY = 0;
    const threshold = 245; // Below this is considered "content" (not white)

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const index = (y * w + x) * 4;
            const r = data[index], g = data[index + 1], b = data[index + 2], a = data[index + 3];

            if (a > 10 && (r < threshold || g < threshold || b < threshold)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (minX > maxX || minY > maxY) return { left: 0, top: 0, width: w, height: h };

    const padding = Math.max(5, w * 0.01);
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(w, maxX + padding);
    maxY = Math.min(h, maxY + padding);

    return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
}

function startCropping() {
    if (!selectedElement || (selectedElement.tagName !== 'IMG' && !selectedElement.classList.contains('inserted-image'))) {
        showToast('Please select an image first', '⚠️');
        return;
    }

    const modal = document.getElementById('cropperModal');
    const cropperImg = document.getElementById('cropperImage');

    modal.classList.remove('hidden');

    // Ensure image is loaded before starting cropper
    cropperImg.onload = () => {
        if (cropper) cropper.destroy();

        showToast('Analyzing content layout...', '🔎');
        // Analyze image and find bounds of the actual drawing
        const autoRect = getAutoCropRect(cropperImg);

        cropper = new Cropper(cropperImg, {
            viewMode: 1,
            dragMode: 'move',
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            ready() {
                // Instantly focus crop box closely around the non-white content
                cropper.setData({
                    x: autoRect.left,
                    y: autoRect.top,
                    width: autoRect.width,
                    height: autoRect.height
                });
                showToast('Auto-cropped to content bounds', '🎯');
            }
        });
        // Clear onload to prevent re-triggering
        cropperImg.onload = null;
    };

    // Need crossOrigin to allow getImageData to process if we are dealing with external images
    cropperImg.crossOrigin = "anonymous";
    cropperImg.src = selectedElement.src;
}

function closeCropper() {
    document.getElementById('cropperModal').classList.add('hidden');
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

function applyCrop() {
    if (!cropper || !selectedElement) return;

    const canvas = cropper.getCroppedCanvas({
        maxWidth: 4096,
        maxHeight: 4096,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
    });

    if (!canvas) {
        showToast('Could not crop image', '❌');
        return;
    }

    canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);

        // Wait for image to load new source then revalidate position
        selectedElement.onload = () => {
            revalidateAssetPosition(selectedElement);
            selectedElement.onload = null; // Prevent re-triggering
        };

        selectedElement.src = url;
        closeCropper();
        showToast('Image cropped successfully', '✂️');
    }, 'image/png');
}

// --- Splitting Logic ---
let isSplitting = false;
let splitOverlay = null;

function prepareSplit() {
    if (!selectedElement || selectedElement.tagName !== 'IMG') return;
    if (isSplitting) return;

    isSplitting = true;
    const parent = selectedElement.parentElement;

    // Create UI
    const container = document.createElement('div');
    container.className = 'split-container';
    container.style.width = selectedElement.style.width || '100%';

    selectedElement.replaceWith(container);
    container.appendChild(selectedElement);

    splitOverlay = document.createElement('div');
    splitOverlay.className = 'split-overlay';
    container.appendChild(splitOverlay);

    const actionGroup = document.createElement('div');
    actionGroup.className = 'split-action-group';
    actionGroup.id = 'activeSplitUI';

    const confirmBtn = document.createElement('button');
    confirmBtn.innerText = '✂️ Confirm Split';
    confirmBtn.onclick = (e) => {
        e.stopPropagation();
        executeSplit(selectedElement, splitOverlay, container);
        actionGroup.remove();
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = '✕ Cancel';
    cancelBtn.className = 'secondary';
    cancelBtn.style.color = '#ff4757';
    cancelBtn.onclick = (e) => {
        e.stopPropagation();
        isSplitting = false;
        container.replaceWith(selectedElement);
        actionGroup.remove();
        showToast('Split cancelled', 'ℹ️');
    };

    actionGroup.appendChild(confirmBtn);
    actionGroup.appendChild(cancelBtn);
    document.body.appendChild(actionGroup);

    // Make overlay draggable
    let isDraggingSplit = false;
    splitOverlay.onmousedown = (e) => {
        isDraggingSplit = true;
        e.stopPropagation();
    };

    window.onmousemove = (e) => {
        if (!isDraggingSplit) return;
        const rect = container.getBoundingClientRect();
        const scale = currentZoom / 100;
        let y = (e.clientY - rect.top) / scale;
        y = Math.max(0, Math.min(y, rect.height / scale));
        splitOverlay.style.top = `${y}px`;
    };

    window.onmouseup = () => {
        isDraggingSplit = false;
    };

    showToast('Drag the line to choose where to cut', '🔪');
}

async function executeSplit(img, line, container) {
    const scale = currentZoom / 100;
    const rect = img.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();

    // Calculate split point in rendered pixels, divided by scale for natural coordinates
    const splitYRendered = (lineRect.top - rect.top) / scale;

    const originalImg = new Image();
    originalImg.crossOrigin = "anonymous";
    originalImg.src = img.src;

    originalImg.onload = () => {
        // Map rendered split Y to the original image's natural height
        // Scale factor: Natural Height / Rendered Height (unscaled)
        const unscaledRenderedHeight = rect.height / scale;
        const naturalToRenderedRatio = originalImg.height / unscaledRenderedHeight;
        const splitY = splitYRendered * naturalToRenderedRatio;

        // Create two parts
        const part1 = createSplitPart(originalImg, 0, splitY);
        const part2 = createSplitPart(originalImg, splitY, originalImg.height - splitY);

        Promise.all([part1, part2]).then(([url1, url2]) => {
            // Find the original index before removal
            const originalIndex = flowAssetsOrder.indexOf(img);

            // Remove split UI and original image
            const parent = container.parentElement;
            const insertBefore = container.nextSibling;
            container.remove();

            // Remove the original image from the flow array
            if (originalIndex !== -1) {
                flowAssetsOrder.splice(originalIndex, 1);
            }

            // Insert new images
            addImageToPaper(url1, true).then((newImg1) => {
                addImageToPaper(url2, true).then((newImg2) => {
                    // addImageToPaper pushed them to the end of the array. Let's move them back to originalIndex.
                    if (originalIndex !== -1) {
                        const idx1 = flowAssetsOrder.indexOf(newImg1);
                        if (idx1 !== -1) flowAssetsOrder.splice(idx1, 1);

                        const idx2 = flowAssetsOrder.indexOf(newImg2);
                        if (idx2 !== -1) flowAssetsOrder.splice(idx2, 1);

                        // Insert both back at the exact original location
                        flowAssetsOrder.splice(originalIndex, 0, newImg1, newImg2);
                    }

                    isSplitting = false;
                    showToast('Image successfully split!', '🎊');
                    revalidateAssetPosition();
                });
            });
        });
    };

    originalImg.onerror = () => {
        showToast('Error loading image for split', '❌');
        isSplitting = false;
        container.replaceWith(img);
    };
}

function createSplitPart(img, y, height) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Standard drawImage sequence: source, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight
        ctx.drawImage(img, 0, y, img.width, height, 0, 0, img.width, height);
        canvas.toBlob((blob) => {
            resolve(URL.createObjectURL(blob));
        }, 'image/png');
    });
}

// --- Event Listeners ---
function setupGlobalListeners() {
    // Canvas Clicks
    paperContainer.addEventListener('click', (e) => {
        if (textModeActive || figureModeActive) {
            const page = e.target.closest('.page-content');
            if (page) {
                const rect = page.getBoundingClientRect();
                const scale = currentZoom / 100;
                const x = (e.clientX - rect.left) / scale;
                const y = (e.clientY - rect.top) / scale;

                if (textModeActive) {
                    const box = createTextBox(x, y);
                    page.appendChild(box);
                    textModeActive = false;
                    document.getElementById('addTextBtn').innerText = '✨ Add Dynamic Text';
                    document.getElementById('addTextBtn').classList.remove('secondary');
                    setTimeout(() => box.focus(), 10);
                    selectElement(box);
                } else if (figureModeActive) {
                    const box = createFigureBox(x, y);
                    page.appendChild(box);
                    figureModeActive = false;
                    const btn = document.querySelector('button[onclick="activateFigureMode()"]');
                    if (btn) {
                        btn.innerText = '📐 Add Math Figure';
                        btn.classList.remove('secondary');
                    }
                    selectElement(box);
                }

                document.body.style.cursor = 'default';
            }
        } else {
            // Deselect if clicking background
            if (e.target === paperContainer) closeAllTools();
        }
    });

    // File Uploads
    document.getElementById('headingUpload').addEventListener('change', function () {
        if (this.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => addImageToPaper(e.target.result, true);
            reader.readAsDataURL(this.files[0]);
        }
    });

    document.getElementById('questionUpload').addEventListener('change', function () {
        Array.from(this.files).forEach(file => addImageToPaper(file));
    });

    document.getElementById('pdfUpload').addEventListener('change', function () {
        if (this.files[0]) handlePdfUpload(this.files[0]);
    });

    // Drag and Drop support
    paperContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        paperContainer.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
    });

    paperContainer.addEventListener('dragleave', () => {
        paperContainer.style.backgroundColor = '';
    });

    paperContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        paperContainer.style.backgroundColor = '';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            Array.from(files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    addImageToPaper(file);
                }
            });
            showToast(`Imported ${files.length} images`, '🖼️');
        }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' && selectedElement) {
            if (document.activeElement === selectedElement) return; // Typing in text box
            deleteSelectedElement();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            window.print();
        }
    });
}

function setupToolbarListeners() {
    const inputs = {
        'textPosX': (val) => selectedElement.style.left = `${val}px`,
        'textPosY': (val) => selectedElement.style.top = `${val}px`,
        'textWidth': (val) => selectedElement.style.width = `${val}px`,
        'textHeight': (val) => selectedElement.style.height = `${val}px`,
        'textFontSize': (val) => selectedElement.style.fontSize = `${val}px`,
        'textPadding': (val) => selectedElement.style.padding = `${val}px`,
        'textColor': (val) => selectedElement.style.color = val,
        'borderColorPicker': (val) => selectedElement.style.borderColor = val,
        'borderWidth': (val) => {
            selectedElement.style.borderWidth = `${val}px`;
            selectedElement.style.borderStyle = val > 0 ? 'solid' : 'none';
        },
        'bgColorPicker': (val) => selectedElement.style.backgroundColor = val,
        'textBold': (val) => selectedElement.style.fontWeight = val ? 'bold' : 'normal',
        'bgTransparent': (val) => {
            if (val) {
                selectedElement.style.backgroundColor = 'transparent';
                document.getElementById('bgColorPicker').setAttribute('disabled', 'true');
            } else {
                const color = document.getElementById('bgColorPicker').value;
                selectedElement.style.backgroundColor = color;
                document.getElementById('bgColorPicker').removeAttribute('disabled');
            }
        }
    };

    Object.keys(inputs).forEach(id => {
        const el = document.getElementById(id);
        const event = (el.type === 'checkbox') ? 'change' : 'input';
        el?.addEventListener(event, (e) => {
            if (!selectedElement) return;
            const val = (el.type === 'checkbox') ? e.target.checked : e.target.value;
            inputs[id](val);
        });
    });

    // Image Specific Listeners
    document.getElementById('imgWidthRange')?.addEventListener('input', (e) => {
        if (selectedElement && (selectedElement.tagName === 'IMG' || selectedElement.classList.contains('inserted-image'))) {
            selectedElement.style.width = `${e.target.value}%`;
            triggerReflow();
        }
    });

    document.getElementById('imgGapRange')?.addEventListener('input', (e) => {
        if (selectedElement && (selectedElement.tagName === 'IMG' || selectedElement.classList.contains('inserted-image'))) {
            const gapVal = `${e.target.value}mm`;
            selectedElement.dataset.gap = gapVal;
            selectedElement.style.marginTop = gapVal;
            triggerReflow();
        }
    });
}

function triggerReflow() {
    if (window._reflowTimer) clearTimeout(window._reflowTimer);
    window._reflowTimer = setTimeout(() => {
        revalidateAssetPosition();
    }, 500);
}
// --- Utilities ---
function deleteSelectedElement() {
    if (!selectedElement) return;
    if (confirm('Delete selected asset?')) {
        const isFlowable = selectedElement.classList.contains('inserted-image');
        selectedElement.remove();
        closeAllTools();
        if (isFlowable) triggerReflow();
        showToast('Element removed', '🗑️');
    }
}

function showToast(text, icon = 'ℹ️') {
    statusText.innerText = text;
    statusIcon.innerText = icon;
    statusToast.classList.remove('hidden');

    // Auto hide after 3 seconds
    if (window._toastTimer) clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
        statusToast.classList.add('hidden');
    }, 3000);
}

function rgbToHex(rgb) {
    if (!rgb || rgb.startsWith('#')) return rgb || '#000000';
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return '#000000';
    const hex = (x) => ("0" + parseInt(x).toString(16)).slice(-2);
    return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
}

// --- Asset Re-flow Logic ---
/**
 * Sequentially pours all flowable assets (images) through the available pages
 * to ensure maximum density while strictly preserving the original order.
 */
let flowAssetsOrder = []; // System tracks user-defined order

function revalidateAssetPosition() {
    // 1. Sync the order array with existing DOM elements (removals)
    const currentAssets = Array.from(document.querySelectorAll('.inserted-image'));
    flowAssetsOrder = flowAssetsOrder.filter(el => currentAssets.includes(el));

    // Ensure all DOM assets are in life (for initialization)
    currentAssets.forEach(el => {
        if (!flowAssetsOrder.includes(el)) flowAssetsOrder.push(el);
    });

    if (flowAssetsOrder.length === 0) return;

    // 2. Clear current positions and prepare page pointers
    let pages = Array.from(document.querySelectorAll('.page-content'));
    let currentPageIdx = 0;

    flowAssetsOrder.forEach(el => {
        let targetPage = pages[currentPageIdx];
        let targetContainer = targetPage.parentElement;

        targetPage.appendChild(el);

        if (targetPage.firstChild === el) {
            el.style.marginTop = '0px';
        } else {
            el.style.marginTop = el.dataset.gap || '1rem';
        }

        while (targetContainer.scrollHeight > targetContainer.clientHeight && targetPage.children.length > 1) {
            currentPageIdx++;

            if (currentPageIdx >= pages.length) {
                createNewPage();
                pages = Array.from(document.querySelectorAll('.page-content'));
            }

            targetPage = pages[currentPageIdx];
            targetContainer = targetPage.parentElement;
            targetPage.appendChild(el);

            if (targetPage.firstChild === el) {
                el.style.marginTop = '0px';
            } else {
                el.style.marginTop = el.dataset.gap || '1rem';
            }
        }
    });

    cleanupEmptyPages();
}

function cleanupEmptyPages() {
    const pages = document.querySelectorAll('.page');
    pages.forEach((page, index) => {
        if (index === 0) return; // Keep at least one page
        const content = page.querySelector('.page-content');
        // If only header/footer exist but no actual assets
        const assets = content.querySelectorAll('.inserted-image, .text-box');
        if (assets.length === 0) {
            page.remove();
            pageCount = document.querySelectorAll('.page').length;
        }
    });
}

// --- High Quality Export / Download Logic ---
async function downloadFullQuality() {
    showToast('Preparing High-Quality Export...', '⏳');

    const pages = document.querySelectorAll('.page');
    // We no longer reset zoom on live pages; onclone handles this for the capture engine.

    // 2. Load capture engines if not already loaded
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        showToast('Loading capture engines...', '⏳');
        
        const loadScript = (src) => new Promise(resolve => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            document.head.appendChild(script);
        });

        if (typeof html2canvas === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        }
        if (typeof window.jspdf === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }
    }

    try {
        const { jsPDF } = window.jspdf;
        let pdf = null;

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            
            // Capture each page
            const canvas = await html2canvas(page, {
                scale: 3, 
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    // Find the current page in the cloned document
                    const clonedPage = clonedDoc.querySelectorAll('.page')[i];
                    if (clonedPage) {
                        clonedPage.style.boxShadow = 'none';
                        clonedPage.style.marginBottom = '0';
                        clonedPage.style.transform = 'scale(1)'; // Ensure it's unscaled in clone
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png');
            
            // Page dimensions in mm (A4)
            const pageWidth = 210;
            const pageHeight = 297;

            if (i === 0) {
                pdf = new jsPDF('p', 'mm', [pageWidth, pageHeight]);
            } else {
                pdf.addPage([pageWidth, pageHeight], 'p');
            }

            pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
            
            showToast(`Processed Page ${i + 1}`, '⏳');
        }

        pdf.save('PageDesigner_Pro_Full_Quality.pdf');
        showToast('Download complete!', '🎉');
    } catch (err) {
        console.error('Export Error:', err);
        showToast('High-quality export failed', '❌');
    } finally {
        // High-quality capture complete
    }
}
