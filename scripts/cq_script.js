(async function () {
  const params = new URLSearchParams(location.search);
  const CONFIG = {
    board: params.get('boardName') || 'Unknown',
    year: Number(params.get('year')) || null,
    subjectLabel: params.get('sub') || 'Unknown',
    subjectPath: 'physics/1st', // change per subject, e.g. 'math/1st', 'chemistry/2nd'
    page: Number(params.get('current')) || null,
  };

  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  CONFIG.sourceDocumentSha256 = await sha256Hex(
    `${CONFIG.board}-${CONFIG.year}-${CONFIG.subjectLabel}-cq`
  );

  const GREEK = {
    'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'Γ': '\\Gamma', 'δ': '\\delta', 'Δ': '\\Delta',
    'ε': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta', 'Θ': '\\Theta', 'ι': '\\iota',
    'κ': '\\kappa', 'λ': '\\lambda', 'Λ': '\\Lambda', 'μ': '\\mu', 'ν': '\\nu', 'ξ': '\\xi',
    'π': '\\pi', 'Π': '\\Pi', 'ρ': '\\rho', 'σ': '\\sigma', 'Σ': '\\Sigma', 'τ': '\\tau',
    'φ': '\\phi', 'Φ': '\\Phi', 'χ': '\\chi', 'ψ': '\\psi', 'Ψ': '\\Psi', 'ω': '\\omega', 'Ω': '\\Omega',
    '∂': '\\partial',
  };

  const FUNCTIONS = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'lim', 'exp', 'min', 'max'];

  const OPERATORS = {
    '−': '-', '×': '\\times', '÷': '\\div', '⋅': '\\cdot', '·': '\\cdot',
    '≤': '\\leq', '≥': '\\geq', '≠': '\\neq', '≈': '\\approx', '∞': '\\infty',
    '→': '\\to', '±': '\\pm', '∘': '\\circ', '∫': '\\int', '∑': '\\sum', '∏': '\\prod',
    '{': '\\{', '}': '\\}',
  };

  function mapSymbol(text) {
    if (GREEK[text]) return GREEK[text];
    if (FUNCTIONS.includes(text)) return '\\' + text;
    return text;
  }

  function mapOperator(text) {
    return OPERATORS[text] !== undefined ? OPERATORS[text] : text;
  }

  function wrapBrace(latex) {
    return '{' + latex + '}';
  }

  function childrenToLatex(node) {
    return Array.from(node.childNodes).map(mmlToLatex).join('');
  }

  function mmlToLatex(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    const kids = Array.from(node.children);

    switch (tag) {
      case 'math':
      case 'mrow':
      case 'mstyle':
      case 'mpadded':
      case 'mphantom':
        return childrenToLatex(node);
      case 'mn':
        return node.textContent;
      case 'mi':
        return mapSymbol(node.textContent);
      case 'mo':
        return mapOperator(node.textContent);
      case 'mtext':
        return '\\text{' + node.textContent + '}';
      case 'mspace':
        return ' ';
      case 'msup':
        return wrapBrace(mmlToLatex(kids[0])) + '^' + wrapBrace(mmlToLatex(kids[1]));
      case 'msub':
        return wrapBrace(mmlToLatex(kids[0])) + '_' + wrapBrace(mmlToLatex(kids[1]));
      case 'msubsup':
        return (
          wrapBrace(mmlToLatex(kids[0])) +
          '_' + wrapBrace(mmlToLatex(kids[1])) +
          '^' + wrapBrace(mmlToLatex(kids[2]))
        );
      case 'mfrac':
        return '\\frac' + wrapBrace(mmlToLatex(kids[0])) + wrapBrace(mmlToLatex(kids[1]));
      case 'msqrt':
        return '\\sqrt' + wrapBrace(childrenToLatex(node));
      case 'mroot':
        return '\\sqrt[' + mmlToLatex(kids[1]) + ']' + wrapBrace(mmlToLatex(kids[0]));
      case 'mover': {
        const base = mmlToLatex(kids[0]);
        const overText = kids[1] ? kids[1].textContent.trim() : '';
        if (overText === '^' || overText === 'ˆ') return '\\hat' + wrapBrace(base);
        if (overText === '\u2192') return '\\vec' + wrapBrace(base);
        if (overText === '\u00AF' || overText === '-') return '\\overline' + wrapBrace(base);
        if (overText === '~') return '\\tilde' + wrapBrace(base);
        return '\\overset' + wrapBrace(mmlToLatex(kids[1])) + wrapBrace(base);
      }
      case 'munder':
        return '\\underset' + wrapBrace(mmlToLatex(kids[1])) + wrapBrace(mmlToLatex(kids[0]));
      case 'munderover':
        return (
          mmlToLatex(kids[0]) +
          '_' + wrapBrace(mmlToLatex(kids[1])) +
          '^' + wrapBrace(mmlToLatex(kids[2]))
        );
      case 'mtable':
        return '\\begin{matrix}' + kids.map(mmlToLatex).join('\\\\ ') + '\\end{matrix}';
      case 'mtr':
        return kids.map(mmlToLatex).join(' & ');
      case 'mtd':
        return childrenToLatex(node);
      case 'semantics': {
        const annotation = node.querySelector(':scope > annotation[encoding="application/x-tex"]');
        if (annotation) return annotation.textContent.trim();
        return kids.length ? mmlToLatex(kids[0]) : '';
      }
      default:
        return childrenToLatex(node);
    }
  }

  // Pulls <img> out of the clone, replaces each with a "[IMG_n]" placeholder in
  // the text stream, and pushes {index, mimeType, data, altText} into assetsOut.
  function extractImages(clone, assetsOut) {
    clone.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      const match = src.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
      const idx = assetsOut.length;
      if (match) {
        assetsOut.push({
          index: idx,
          mimeType: match[1],
          data: match[2],
          altText: img.getAttribute('alt') || '',
        });
      } else {
        // external / non-data-uri image — keep the URL instead of inlining bytes
        assetsOut.push({ index: idx, url: src, altText: img.getAttribute('alt') || '' });
      }
      img.replaceWith(document.createTextNode(`[IMG_${idx}]`));
    });
  }

  function texify(root, assetsOut) {
    const clone = root.cloneNode(true);
    clone.querySelectorAll('br').forEach((br) => br.replaceWith(document.createTextNode('\n')));

    if (assetsOut) extractImages(clone, assetsOut);

    // Space-guard: keep Bangla text and inline math from fusing together when
    // the source has no whitespace between them.
    clone.querySelectorAll('mjx-container, span.katex').forEach((el) => {
      const prev = el.previousSibling;
      if (prev && prev.nodeType === Node.TEXT_NODE && prev.textContent.length && !/\s$/.test(prev.textContent)) {
        prev.textContent += ' ';
      }
      const next = el.nextSibling;
      if (next && next.nodeType === Node.TEXT_NODE && next.textContent.length && !/^\s/.test(next.textContent)) {
        next.textContent = ' ' + next.textContent;
      }
    });

    clone.querySelectorAll('mjx-container').forEach((mjx) => {
      const mathEl = mjx.querySelector('mjx-assistive-mml math') || mjx.querySelector('math');
      const latex = mathEl ? mmlToLatex(mathEl).trim() : mjx.textContent.trim();
      mjx.replaceWith(document.createTextNode('$' + latex + '$'));
    });

    clone.querySelectorAll('span.katex').forEach((katex) => {
      const annotation = katex.querySelector('annotation[encoding="application/x-tex"]');
      const tex = annotation ? annotation.textContent.trim() : katex.textContent.trim();
      katex.replaceWith(document.createTextNode('$' + tex + '$'));
    });

    return clone.textContent.replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
  }

  function findCards() {
    return Array.from(document.querySelectorAll('div')).filter(
      (d) =>
        d.classList.contains('rounded-2xl') &&
        d.classList.contains('shadow-sm') &&
        d.classList.contains('overflow-hidden') &&
        d.classList.contains('border')
    );
  }

  // Each CQ part lives in its own accordion wrapper: a div.rounded-lg.border
  // holding a <button> (question) that, on click, reveals the answer as a
  // sibling block inside the same wrapper. Only one part stays expanded at a
  // time, so parts must be scraped one-by-one, in order.
  function findParts(card) {
    return Array.from(card.querySelectorAll('div.rounded-lg.border')).filter((d) =>
      d.querySelector('button span.rounded-full')
    );
  }

  async function revealPart(partEl) {
    const notoBefore = partEl.querySelectorAll('div.noto').length;
    if (notoBefore > 1) return; // already expanded from a previous run

    const btn = partEl.querySelector('button');
    if (!btn) return;

    btn.click();
    // wait for accordion expand animation / DOM update
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  let lastChapterNumber = null;

  async function scrapeCard(card) {
    const numberBadge = card.querySelector('span.rounded-lg.poppins, span.poppins.font-bold');
    const questionNumber = numberBadge ? numberBadge.textContent.trim() : null;
    if (!questionNumber) return null;

    const stimulusAssets = [];
    const stimulusEl = card.querySelector('div.noto.font-medium');
    const stimulusText = stimulusEl ? texify(stimulusEl, stimulusAssets) : '';

    const chapterEl = card.querySelector('p.poppins');
    const chapterMatch = chapterEl ? chapterEl.textContent.match(/Chapter\s*(\d+)/i) : null;
    const chapterNumber = chapterMatch ? chapterMatch[1] : lastChapterNumber;
    if (chapterNumber) lastChapterNumber = chapterNumber;

    const partEls = findParts(card);
    if (partEls.length === 0) return null;

    const parts = [];
    for (const partEl of partEls) {
      const keyEl = partEl.querySelector('button span.rounded-full');
      const key = keyEl ? keyEl.textContent.trim() : null;

      // the question text lives inside the button, before reveal
      const questionEl = partEl.querySelector('button div.noto');
      const questionText = questionEl ? texify(questionEl) : '';

      await revealPart(partEl);

      const notoDivs = Array.from(partEl.querySelectorAll('div.noto'));
      // first div.noto is the question itself (inside the button); anything
      // after that is the revealed answer content
      const answerEls = notoDivs.slice(1);
      const partAssets = [];
      const answerText = answerEls.length
        ? answerEls.map((el) => texify(el, partAssets)).join('\n\n')
        : null;

      if (!answerText) {
        console.warn(`Part "${key}" of question ${questionNumber} has no revealed answer — click/selector may need adjusting.`);
      }

      parts.push({
        key,
        questionText,
        answerText,
        assets: partAssets,
      });
    }

    const subjectSlug = CONFIG.subjectPath.replace('/', '');
    const clientId = `${CONFIG.board.toLowerCase()}-${CONFIG.year}-${subjectSlug}-cq${questionNumber}`;
    const paperMatch = CONFIG.subjectLabel.match(/1st|2nd/i);

    return {
      clientId,
      curriculum: {
        path: chapterNumber ? `hsc/${CONFIG.subjectPath}/chapter-${chapterNumber}` : null,
      },
      questionNumber,
      formatCode: 'cq',
      translations: {
        bn: {
          stimulusText,
        },
      },
      parts,
      assets: stimulusAssets,
      provenance: {
        sourceDocumentSha256: CONFIG.sourceDocumentSha256,
        page: CONFIG.page,
        bbox: null,
        extractorModel: 'human',
        promptVersion: 'import-json-guide-2026-09',
        confidence: 1,
      },
      sources: [
        {
          source_type: 'board_exam',
          exam_category_code: 'board',
          organization: CONFIG.board,
          exam_name: `HSC ${CONFIG.subjectLabel}`,
          year: CONFIG.year,
          session: null,
          paper: paperMatch ? paperMatch[0] : null,
          unit_name: null,
          set_name: null,
          source_reference: null,
          source_item_reference: questionNumber,
        },
      ],
    };
  }

  window.__scrapedCQItems = window.__scrapedCQItems || [];

  async function scrapePage() {
    const cards = findCards();
    let added = 0;
    let updated = 0;

    for (const card of cards) {
      const item = await scrapeCard(card);
      if (!item) continue;

      const idx = window.__scrapedCQItems.findIndex((x) => x.clientId === item.clientId);
      if (idx === -1) {
        window.__scrapedCQItems.push(item);
        added++;
      } else {
        window.__scrapedCQItems[idx] = item;
        updated++;
      }
    }

    console.log(`Added ${added}, updated ${updated}. Total: ${window.__scrapedCQItems.length}`);
    return window.__scrapedCQItems;
  }

  function downloadJSON(filename) {
    const output = {
      schemaVersion: 'ezpz-content-import-v2',
      items: window.__scrapedCQItems,
    };
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'scraped-cq.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  window.scrapeCQPage = scrapePage;
  window.downloadCQJSON = downloadJSON;
  await scrapePage();
})();