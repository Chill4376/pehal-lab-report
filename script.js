function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.src = url;
  });
}

async function generatePDF() {
  const doc = new window.jspdf.jsPDF();
  const logo = await loadImage("logo.png");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ========= RANGE CHECK =========
  function isOutOfRange(value, range) {
    if (!value || value === "-" || !range) return false;
    const num = Number(value);
    if (isNaN(num)) return false;

    if (range.includes("<")) return num >= Number(range.replace("<", "").trim());
    if (range.includes(">=")) return num < Number(range.replace(">=", "").trim());

    if (range.includes("–") || range.includes("-")) {
      const [min, max] = range.replace("–", "-").split("-").map(v => Number(v.trim()));
      return num < min || num > max;
    }
    return false;
  }

  // ========= CLEAN UNDERLINE =========
  function underlineCellText(doc, data) {
    const text = String(data.cell.raw);
    const x = data.cell.x + 2;
    const y = data.cell.y + data.cell.height / 2 + 3;
    const textWidth = doc.getTextWidth(text);
    doc.setLineWidth(0.25);
    doc.line(x, y + 1.2, x + textWidth, y + 1.2);
  }

  // ========= READ INPUTS =========
const patientName = document.getElementById("name")?.value || "";
const patientAge = document.getElementById("age")?.value || "";
const patientSex = document.getElementById("sex")?.value || "";

const uaidVal = document.getElementById("uaid")?.value || "";
const sinVal = document.getElementById("sin_no")?.value || "";

const sampleCollection = document.getElementById("sample_collection_time")?.value || "";
const sampleReceived = document.getElementById("sample_received_time")?.value || "";
const reportedTime = document.getElementById("reported_time")?.value || "";
const refDoctor = document.getElementById("ref_doctor")?.value || "";


  // ========= HEADER =========
  function drawHeader() {
    const logoWidth = pageWidth * 0.92;
    let logoHeight = (logo.height * logoWidth) / logo.width;
    logoHeight = Math.min(Math.max(logoHeight, 25), 40);

    doc.addImage(logo, "PNG", (pageWidth - logoWidth) / 2, 16, logoWidth, logoHeight);

    let y = 16 + logoHeight + 14;
    doc.setFontSize(10);

    doc.rect(15, y, 85, 30);
    doc.text(`Patient Name : ${patientName}`, 18, y + 7);
    doc.text(`Age / Gender : ${patientAge} / ${patientSex}`, 18, y + 14);
    doc.text(`UAID / Lab Ref : ${uaidVal}`, 18, y + 21);
    doc.text(`SIN No. : ${sinVal}`, 18, y + 28);

    doc.rect(110, y, 85, 30);
    doc.text(`Sample Collection Time : ${sampleCollection}`, 113, y + 7);
    doc.text(`Sample Received Time : ${sampleReceived}`, 113, y + 14);
    doc.text(`Reported Time : ${reportedTime}`, 113, y + 21);
    doc.text(`Ref. Doctor : ${refDoctor}`, 113, y + 28);

    return y + 40;
  }

  // ========= TABLE STYLE =========
  const tableStyle = {
    styles: { lineColor: [0, 0, 0], lineWidth: 0.5, fontSize: 10 },
    headStyles: { fillColor: false, textColor: 0, lineWidth: 0.5 },

    didParseCell(data) {
      if (data.section === "body" && data.column.index === 1) {
        const range = data.row.raw[3];
        if (isOutOfRange(data.cell.raw, range)) {
          data.cell.styles.fontStyle = "bold";
        }
      }
    },

    didDrawCell(data) {
      if (data.section === "body" && data.column.index === 1) {
        const range = data.row.raw[3];
        if (isOutOfRange(data.cell.raw, range)) {
          underlineCellText(doc, data);
        }
      }
    }
  };

  let firstPage = true;

  // ========= LIPID PROFILE =========
  if (tc.value || tg.value || hdl.value) {
    if (!firstPage) doc.addPage();
    firstPage = false;
    let y = drawHeader();

    const tcV = tc.value || "-";
    const tgV = tg.value || "-";
    const hdlV = hdl.value || "-";
    const vldl = tgV !== "-" ? (tgV / 5).toFixed(1) : "-";
    const ldl = tcV !== "-" && hdlV !== "-" ? (tcV - hdlV - vldl).toFixed(1) : "-";

    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFontSize(9);
    doc.setFont(undefined, "italic");
    doc.text("LIPID PROFILE", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test", "Result", "Unit", "Reference Range"]],
      body: [
        ["Total Cholesterol", tcV, "mg/dL", "< 200"],
        ["Triglycerides", tgV, "mg/dL", "< 150"],
        ["HDL Cholesterol", hdlV, "mg/dL", ">= 40"],
        ["LDL Cholesterol (Calc)", ldl, "mg/dL", "< 100"],
        ["VLDL Cholesterol (Calc)", vldl, "mg/dL", "5 - 40"]
      ],
      ...tableStyle
    });
  }

  // ========= WHOLE BLOOD EDTA =========
  if (hba1c.value || emp_glucose.value) {
    doc.addPage();
    let y = drawHeader();

    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFontSize(9);
    doc.setFont(undefined, "italic");
    doc.text("WHOLE BLOOD EDTA", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range", "Method"]],
      body: [
        ["HbA1c", hba1c.value || "-", "%", "4.0 – 6.0", "HPLC"],
        ["Estimated Mean Plasma Glucose", emp_glucose.value || "-", "mg/dL", "65 – 136", "Calculated"]
      ],
      ...tableStyle
    });
  }

  // ========= LIVER FUNCTION SCREENING =========
  const lftFields = [
    ["Total Bilirubin", "bilirubin_total", "mg/dL", "0.3 – 1.2"],
    ["Direct Bilirubin", "bilirubin_direct", "mg/dL", "0.0 – 0.3"],
    ["Indirect Bilirubin", "bilirubin_indirect", "mg/dL", "0.2 – 0.9"],
    ["SGOT / AST", "sgot", "U/L", "< 40"],
    ["SGPT / ALT", "sgpt", "U/L", "< 41"],
    ["Alkaline Phosphatase", "alp", "U/L", "44 – 147"],
    ["Total Protein", "total_protein", "g/dL", "6.0 – 8.3"],
    ["Albumin", "albumin", "g/dL", "3.5 – 5.0"],
    ["Globulin", "globulin", "g/dL", "2.0 – 3.5"],
    ["A/G Ratio", "ag_ratio", "", "1.1 – 2.5"]
  ];

  const lftRows = lftFields
    .map(f => document.getElementById(f[1]).value ? [f[0], document.getElementById(f[1]).value, f[2], f[3]] : null)
    .filter(Boolean);

  if (lftRows.length) {
    doc.addPage();
    let y = drawHeader();

    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFontSize(9);
    doc.setFont(undefined, "italic");
    doc.text("LIVER FUNCTION SCREENING", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range"]],
      body: lftRows,
      ...tableStyle
    });
  }

  // ========= RENAL FUNCTION SCREENING =========
  const renalFields = [
    ["Urea", "urea", "mg/dL", "10 - 50", "Urease-GLDH"],
    ["Blood Urea Nitrogen", "bun", "mg/dL", "5 - 23", "Calculated"],
    ["Creatinine", "creatinine", "mg/dL", "0.4 - 1.5", "JAFFE’s"],
    ["GFR, Estimated", "egfr", "ml/min/1.73m²", "", "Calculated"],
    ["Uric Acid", "uric_acid_renal", "mg/dL", "3.5 - 7.2", "Uricase - PAP"],
    ["BUN / Creatinine Ratio", "bun_creatinine_ratio", "", "10 - 25", "Calculated"],
    ["Urea / Creatinine Ratio", "urea_creatinine_ratio", "", "20 - 50", "Calculated"]
  ];

  const renalRows = renalFields
    .map(f => document.getElementById(f[1])?.value ? [f[0], document.getElementById(f[1]).value, f[2], f[3], f[4]] : null)
    .filter(Boolean);

  if (renalRows.length) {
    doc.addPage();
    let y = drawHeader();

    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFontSize(9);
    doc.setFont(undefined, "italic");
    doc.text("RENAL FUNCTION SCREENING, SERUM", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range", "Method"]],
      body: renalRows,
      ...tableStyle
    });
  }

  // ========= FOOTER =========
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.line(15, pageHeight - 40, 85, pageHeight - 40);
    doc.text("Doctor's Signature", 15, pageHeight - 34);
    if (refDoctor) doc.text(`(${refDoctor})`, 15, pageHeight - 28);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 20, { align: "right" });
  }

  doc.save("Pehal_Grewal_Lab_Report.pdf");
}