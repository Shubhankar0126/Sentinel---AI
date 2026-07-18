const fs = require("fs");
const path = require("path");

const {
  buildCsvContent,
  downloadCsv,
  downloadPdfReport
} = require("./compiled/export.js");

const downloadDirectory = path.join(__dirname, "downloads");
const csvFilename = "sentinel-export-check.csv";
const pdfFilename = "sentinel-export-check.pdf";
const csvPath = path.join(downloadDirectory, csvFilename);
const pdfPath = path.join(downloadDirectory, pdfFilename);

const sampleRows = [
  {
    title: "Zone A incident",
    subtitle: 'Zone A, "North" processing line',
    status: "critical",
    timestamp: "2026-07-17T10:30:00Z"
  },
  {
    title: "Permit review",
    subtitle: "Hot work overlap near compressor bay",
    status: "warning",
    timestamp: "2026-07-17T11:15:00Z"
  }
];

const pdfSections = [
  {
    heading: "Summary",
    body: "Time range: 7 days\nRecords: 2\nDrill-down: Risks"
  },
  {
    heading: "Records",
    body: sampleRows
      .map((row) => `${row.title} | ${row.status} | ${row.subtitle} | ${row.timestamp}`)
      .join("\n")
  }
];

for (const entry of fs.readdirSync(downloadDirectory)) {
  fs.rmSync(path.join(downloadDirectory, entry), { force: true });
}

const objectUrls = new Map();
const pendingWrites = [];
let openWasCalled = false;

global.URL = {
  createObjectURL(blob) {
    const objectUrl = `blob:${objectUrls.size + 1}`;
    objectUrls.set(objectUrl, blob);
    return objectUrl;
  },
  revokeObjectURL(objectUrl) {
    objectUrls.delete(objectUrl);
  }
};

global.document = {
  body: {
    appendChild() {}
  },
  createElement(tagName) {
    if (tagName !== "a") {
      throw new Error(`Unexpected element requested: ${tagName}`);
    }

    return {
      href: "",
      download: "",
      rel: "",
      style: {},
      remove() {},
      click() {
        const blob = objectUrls.get(this.href);
        if (!blob) {
          throw new Error(`No Blob found for ${this.href}`);
        }

        pendingWrites.push(
          (async () => {
            const buffer = Buffer.from(await blob.arrayBuffer());
            fs.writeFileSync(path.join(downloadDirectory, this.download), buffer);
          })()
        );
      }
    };
  }
};

global.window = {
  setTimeout(callback) {
    callback();
    return 0;
  },
  open() {
    openWasCalled = true;
    throw new Error("window.open should not be called during export");
  }
};

(async () => {
  const csvPreview = buildCsvContent(sampleRows);

  downloadCsv(csvFilename, sampleRows);
  downloadPdfReport(pdfFilename, "Sentinel Analytics - Risks", pdfSections);

  await Promise.all(pendingWrites);

  const csvExists = fs.existsSync(csvPath);
  const pdfExists = fs.existsSync(pdfPath);
  const csvContent = csvExists ? fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "") : "";
  const pdfBuffer = pdfExists ? fs.readFileSync(pdfPath) : Buffer.alloc(0);

  const result = {
    csvExists,
    pdfExists,
    openWasCalled,
    csvSize: csvExists ? fs.statSync(csvPath).size : 0,
    pdfSize: pdfExists ? fs.statSync(pdfPath).size : 0,
    csvHeaderIncluded: csvContent.startsWith("title,subtitle,status,timestamp"),
    csvEscapingValid: csvContent.includes('"Zone A, ""North"" processing line"'),
    csvRowCount: csvContent ? csvContent.split(/\r?\n/).length : 0,
    csvMatchesBuilder: csvPreview === csvContent,
    pdfHeaderValid: pdfBuffer.subarray(0, 8).toString("utf8") === "%PDF-1.4",
    pdfContainsTitle: pdfBuffer.includes(Buffer.from("Sentinel Analytics - Risks")),
    pdfContainsSummary: pdfBuffer.includes(Buffer.from("Time range: 7 days")),
    pdfContainsRecords: pdfBuffer.includes(Buffer.from("Zone A incident | critical | Zone A, \"North\" processing line")),
    pdfContainsEof: pdfBuffer.includes(Buffer.from("%%EOF")),
    downloadFiles: fs.readdirSync(downloadDirectory).sort()
  };

  console.log(JSON.stringify(result, null, 2));

  const failed =
    !result.csvExists ||
    !result.pdfExists ||
    result.openWasCalled ||
    !result.csvHeaderIncluded ||
    !result.csvEscapingValid ||
    !result.csvMatchesBuilder ||
    !result.pdfHeaderValid ||
    !result.pdfContainsTitle ||
    !result.pdfContainsSummary ||
    !result.pdfContainsRecords ||
    !result.pdfContainsEof;

  if (failed) {
    process.exit(1);
  }
})();
