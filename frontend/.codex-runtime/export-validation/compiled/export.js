"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCsvContent = buildCsvContent;
exports.downloadCsv = downloadCsv;
exports.buildPdfDocument = buildPdfDocument;
exports.downloadPdfReport = downloadPdfReport;
exports.openPrintableReport = openPrintableReport;
const UTF8_BOM = "\uFEFF";
const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;
const PDF_MARGIN = 48;
const PDF_TITLE_SIZE = 20;
const PDF_HEADING_SIZE = 14;
const PDF_BODY_SIZE = 10;
const PDF_LINE_HEIGHT_MULTIPLIER = 1.5;
const PDF_MONOSPACE_WIDTH_FACTOR = 0.6;
function triggerDownload(filename, blob) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(objectUrl);
    }, 0);
}
function normalizeExportValue(value) {
    if (value === null || value === undefined) {
        return "";
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
        return String(value);
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value) || typeof value === "object") {
        return JSON.stringify(value);
    }
    return String(value);
}
function escapeCsvValue(value) {
    const normalized = normalizeExportValue(value);
    if (/[",\n\r]/.test(normalized)) {
        return `"${normalized.replaceAll('"', '""')}"`;
    }
    return normalized;
}
function sanitizeFilename(filename, extension) {
    const normalizedBase = filename
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    const safeBase = normalizedBase || "sentinel-export";
    return safeBase.toLowerCase().endsWith(`.${extension.toLowerCase()}`) ? safeBase : `${safeBase}.${extension}`;
}
function toAsciiPdfText(value) {
    return value
        .replace(/\t/g, "  ")
        .replace(/[^\x20-\x7E]/g, "?");
}
function escapePdfText(value) {
    return toAsciiPdfText(value)
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}
function wrapText(text, maxCharactersPerLine) {
    const lines = [];
    const normalizedInput = normalizeExportValue(text);
    for (const rawLine of normalizedInput.split(/\r?\n/)) {
        if (!rawLine.trim()) {
            lines.push("");
            continue;
        }
        let remaining = rawLine.trimEnd();
        while (remaining.length > maxCharactersPerLine) {
            const candidate = remaining.slice(0, maxCharactersPerLine + 1);
            const breakAt = Math.max(candidate.lastIndexOf(" "), candidate.lastIndexOf("-"));
            const sliceEnd = breakAt > 0 ? breakAt : maxCharactersPerLine;
            lines.push(remaining.slice(0, sliceEnd).trimEnd());
            remaining = remaining.slice(sliceEnd).trimStart();
        }
        lines.push(remaining);
    }
    return lines;
}
function buildPdfLines(title, sections) {
    const usableWidth = PDF_PAGE_WIDTH - PDF_MARGIN * 2;
    const titleLineLength = Math.max(1, Math.floor(usableWidth / (PDF_TITLE_SIZE * PDF_MONOSPACE_WIDTH_FACTOR)));
    const headingLineLength = Math.max(1, Math.floor(usableWidth / (PDF_HEADING_SIZE * PDF_MONOSPACE_WIDTH_FACTOR)));
    const bodyLineLength = Math.max(1, Math.floor(usableWidth / (PDF_BODY_SIZE * PDF_MONOSPACE_WIDTH_FACTOR)));
    const lines = wrapText(title, titleLineLength).map((line) => ({
        text: line,
        font: "bold",
        fontSize: PDF_TITLE_SIZE,
        lineHeight: PDF_TITLE_SIZE * PDF_LINE_HEIGHT_MULTIPLIER
    }));
    lines.push({
        text: "",
        font: "regular",
        fontSize: PDF_BODY_SIZE,
        lineHeight: PDF_BODY_SIZE * PDF_LINE_HEIGHT_MULTIPLIER
    });
    for (const section of sections) {
        lines.push(...wrapText(section.heading, headingLineLength).map((line) => ({
            text: line,
            font: "bold",
            fontSize: PDF_HEADING_SIZE,
            lineHeight: PDF_HEADING_SIZE * PDF_LINE_HEIGHT_MULTIPLIER
        })));
        lines.push(...wrapText(section.body, bodyLineLength).map((line) => ({
            text: line,
            font: "regular",
            fontSize: PDF_BODY_SIZE,
            lineHeight: PDF_BODY_SIZE * PDF_LINE_HEIGHT_MULTIPLIER
        })));
        lines.push({
            text: "",
            font: "regular",
            fontSize: PDF_BODY_SIZE,
            lineHeight: PDF_BODY_SIZE * PDF_LINE_HEIGHT_MULTIPLIER
        });
    }
    return lines;
}
function buildPdfPages(lines) {
    const pages = [];
    let commands = [];
    let currentY = PDF_PAGE_HEIGHT - PDF_MARGIN;
    const pushPage = () => {
        if (commands.length) {
            pages.push(commands.join("\n"));
            commands = [];
        }
        currentY = PDF_PAGE_HEIGHT - PDF_MARGIN;
    };
    for (const line of lines) {
        if (currentY - line.lineHeight < PDF_MARGIN) {
            pushPage();
        }
        if (line.text) {
            const fontName = line.font === "bold" ? "F2" : "F1";
            commands.push(`BT /${fontName} ${line.fontSize} Tf 1 0 0 1 ${PDF_MARGIN.toFixed(2)} ${currentY.toFixed(2)} Tm (${escapePdfText(line.text)}) Tj ET`);
        }
        currentY -= line.lineHeight;
    }
    if (!pages.length || commands.length) {
        pushPage();
    }
    return pages;
}
function buildCsvContent(rows) {
    if (!rows.length) {
        return "";
    }
    const headers = Array.from(rows.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
    }, new Set()));
    return [
        headers.map((header) => escapeCsvValue(header)).join(","),
        ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(","))
    ].join("\r\n");
}
function downloadCsv(filename, rows) {
    const csv = buildCsvContent(rows);
    if (!csv) {
        return;
    }
    triggerDownload(sanitizeFilename(filename, "csv"), new Blob([UTF8_BOM, csv], { type: "text/csv;charset=utf-8" }));
}
function buildPdfDocument(title, sections) {
    const encoder = new TextEncoder();
    const pageContents = buildPdfPages(buildPdfLines(title, sections));
    const pageObjectNumbers = pageContents.map((_, index) => 5 + index * 2);
    const contentObjectNumbers = pageContents.map((_, index) => 6 + index * 2);
    const maxObjectNumber = 4 + pageContents.length * 2;
    const objects = new Map();
    objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
    objects.set(2, `<< /Type /Pages /Kids [${pageObjectNumbers.map((pageObjectNumber) => `${pageObjectNumber} 0 R`).join(" ")}] /Count ${pageContents.length} >>`);
    objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
    objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>");
    pageContents.forEach((content, index) => {
        const pageObjectNumber = pageObjectNumbers[index];
        const contentObjectNumber = contentObjectNumbers[index];
        const contentLength = encoder.encode(content).length;
        objects.set(pageObjectNumber, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH.toFixed(2)} ${PDF_PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
        objects.set(contentObjectNumber, `<< /Length ${contentLength} >>\nstream\n${content}\nendstream`);
    });
    const chunks = ["%PDF-1.4\n% Sentinel AI export\n"];
    const offsets = new Array(maxObjectNumber + 1).fill(0);
    let byteLength = encoder.encode(chunks[0]).length;
    for (let objectNumber = 1; objectNumber <= maxObjectNumber; objectNumber += 1) {
        const body = objects.get(objectNumber);
        if (!body) {
            continue;
        }
        offsets[objectNumber] = byteLength;
        const serializedObject = `${objectNumber} 0 obj\n${body}\nendobj\n`;
        chunks.push(serializedObject);
        byteLength += encoder.encode(serializedObject).length;
    }
    const xrefStart = byteLength;
    const xref = [
        `xref\n0 ${maxObjectNumber + 1}\n`,
        "0000000000 65535 f \n",
        ...offsets
            .slice(1)
            .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
        `trailer\n<< /Size ${maxObjectNumber + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
    ].join("");
    chunks.push(xref);
    return encoder.encode(chunks.join(""));
}
function downloadPdfReport(filename, title, sections) {
    const pdf = buildPdfDocument(title, sections);
    triggerDownload(sanitizeFilename(filename, "pdf"), new Blob([pdf], { type: "application/pdf" }));
}
function openPrintableReport(title, sections) {
    downloadPdfReport(title, title, sections);
}
